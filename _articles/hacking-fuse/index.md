---
layout: post
title: Hacking Fuse Camera Feeds
date: 2026-05-05
toc: true
author: Jack Crane
header_effect: dither
---

## Introduction

At the 3d printing lab I work at (Saint Louis University's Center for Additive Manufacturing), we took delivery of 2 Formlabs Fuse 1+ SLS 3d printers. These printers have been excellent from an engineering, delivery, and education perspective. A significant part of our mission is outreach and education. We have resources and equipment most people have never even imagined, much less heard of or had access to. We want to share that with as many people as possible. As such, acquiring and publishing high quality media is important to us.

For our day-to-day printing work, we use Bambu Lab filament printers. These printers have a built in webcam that automatically records prints, and they provide a setting to create smooth timelapse videos of the print process. In these videos, it moves the print head to a consistent location for each frame, so the resulting video shows the part just magically appearing while the print head is parked.

We have created a similar setup for our Stratasys J735 Polyjet printer by positioning a switch that is triggered by the print head when it returns to the home position, and that switch triggers a camera to take a photo.

This post talks about the journey and challenges in building a recorder for our printers.

<video controls autoplay muted>
  <source src="print-trim.mp4">
</video>

## The problem

The Fuse 1+ SLS printer does have a built-in camera, and that camera can be watched live through PreForm (Formlabs' slicer software). However, there is no built in way to record the prints or to download video recordings (unless the print fails). We have been able to get around this limitation by opening PreForm, opening the video feed, and setting a screen recorder to capture the computer screen.

This is far from ideal. It requires some overhead on the host computer, requires PreForm to be open, and most significantly, we can't really use the client computer while the screen recording is going on for fear of disturbing the video.

## Potential (existing) solutions

There have been a few threads on the Formlabs forum [[1](https://forum.formlabs.com/t/fuse-1-api-access-to-camera-feed-for-omm-users/44477)] [[2](https://forum.formlabs.com/t/fuse-1-unable-to-review-camera-remotely/33893/5)] [[3](https://forum.formlabs.com/t/timelapse-for-fuse-1/45390/6)] asking if Formlabs would provide access to the cameras or timelapses, most of which have just ended up going defunct. There was a reference to a [knowledge base/support article](https://support.formlabs.com/s/article/Downloading-printer-history-SLS?language=en_US#print-videos) discussing downloading videos of SLS prints by exporting a logs package using PreForm.

While this may be a solution, we experienced inconsistent behavior, corrupted or missing video files, and just an overall challenging and unreliable workflow. And not for nothing, it's just *inconvenient*.

## Defining a real solution

For our workflow, we need some video solution that is:

1. Easy and effortless to start/access a recording
2. Gets out of the way when we don't want to record a print
3. Approachable by people who are technical, but not necessarily software people
4. Something that does not interfere with the existing printing process or workflow

To me, the solution is to connect directly to the printer and record the video feed directly. Effectively this is the same solution as the screen recording, without the screen recording. We would be able to start a recording, minimize the tool, and go on with our work.

So connecting to the printers and requesting the video feed directly from them. It can't be *that involved*, right? Formlabs even has an [API](https://formlabs-dashboard-api-resources.s3.amazonaws.com/formlabs-local-api-latest.html#tag/Devices/operation/getDevices) for talking to printers.....

## Finding an approach

First, I checked to see if the printer was emitting a standard video livestream. Of course it was not. Eventually, I settled on eavesdropping on the network when I have PreForm open and talking to the printer. Using Wireshark, I captured about a minute worth of traffic, including launching PreForm, connecting to the printer, getting the print status, and opening the live camera feed.

After some filtering, I identified a few interesting requests.

## Network sniffing: Printer status

**Request for Status**

Below is a packet sent from the computer running PreForm to the printer. The only part we care about in this packet is the overall shape, and the method `PROTOCOL_METHOD_GET_STATUS`.

```text :filename="TCP Client to Printer (10.120.8.59 to 10.120.8.38) | Request for Status" :linenos :linenosoverride=0000,0010,0020,0030,0040,0050,0060,0070,0080,0090,00a0,00b0,00c0 :highlight={6,7,8,9,10,11,12}
38 0a ab 95 fa 20 9c 53 22 86 98 ea 08 00 45 02   8.... .S".....E.
00 b5 00 00 40 00 40 06 14 f1 0a 78 08 3b 0a 78   ....@.@....x.;.x
08 26 e3 1d 00 23 03 d6 1d b3 3f d9 26 a0 80 18   .&...#....?.&...
08 00 db f6 00 00 01 01 08 0a 68 61 9f 91 16 91   ..........ha....
e4 ce 75 00 00 00 7b 0a 20 20 20 20 22 49 64 22   ..u...{.    "Id"
3a 20 22 7b 39 30 30 62 33 36 32 66 2d 63 36 61   : "{900b362f-c6a
31 2d 34 30 64 64 2d 61 61 31 38 2d 31 33 35 33   1-40dd-aa18-1353
36 62 35 38 35 61 31 63 7d 22 2c 0a 20 20 20 20   6b585a1c}",.
22 4d 65 74 68 6f 64 22 3a 20 22 50 52 4f 54 4f   "Method": "PROTO
43 4f 4c 5f 4d 45 54 48 4f 44 5f 47 45 54 5f 53   COL_METHOD_GET_S
54 41 54 55 53 22 2c 0a 20 20 20 20 22 56 65 72   TATUS",.    "Ver
73 69 6f 6e 22 3a 20 31 0a 7d 0a 00 00 00 00 00   sion": 1.}......
00 00 00                                          ...
```

**Response with Status**

The printer immediately responded with its status over two packets:

```text :filename="TCP Printer to Client (10.120.8.38 to 10.120.8.59) | Response with Status" :filehref="./status-response-pt1.txt" :linenos :linenosoverride=0040,0050,0060,0070,0080,0090,00a0,00b0,00c0,00d0,00e0,....,....,....,....,0550,0560,0570,0580,0590,05a0,05b0,05c0,05d0,05e0
9f 91 e4 07 00 00 7b 0a 20 20 20 20 22 49 64 22   ......{.    "Id"
3a 20 22 7b 39 30 30 62 33 36 32 66 2d 63 36 61   : "{900b362f-c6a
31 2d 34 30 64 64 2d 61 61 31 38 2d 31 33 35 33   1-40dd-aa18-1353
36 62 35 38 35 61 31 63 7d 22 2c 0a 20 20 20 20   6b585a1c}",.
22 50 61 72 61 6d 65 74 65 72 73 22 3a 20 7b 0a   "Parameters": {.
20 20 20 20 20 20 20 20 22 62 65 64 54 65 6d 70           "bedTemp
65 72 61 74 75 72 65 5f 43 22 3a 20 31 36 39 2e   erature_C": 169.
31 38 39 34 35 33 31 32 35 2c 0a 20 20 20 20 20   189453125,.
20 20 20 22 63 75 72 72 65 6e 74 6c 79 52 75 6e      "currentlyRun
6e 69 6e 67 4a 6f 62 48 65 69 67 68 74 73 22 3a   ningJobHeights":
20 5b 0a 20 20 20 20 20 20 20 20 20 20 20 20 7b    [.            {
...............................................   ................
...... 70 lines truncated for brevity .........   ................
...Click the block label at the top for more...   ................
...............................................   ................
33 37 35 2c 0a 20 20 20 20 20 20 20 20 22 65 73   375,.        "es
74 69 6d 61 74 65 64 50 72 69 6e 74 54 69 6d 65   timatedPrintTime
52 65 6d 61 69 6e 69 6e 67 5f 6d 73 22 3a 20 35   Remaining_ms": 5
36 36 30 38 33 35 34 2e 38 30 33 36 37 33 38 32   6608354.80367382
2c 0a 20 20 20 20 20 20 20 20 22 65 73 74 69 6d   ,.        "estim
61 74 65 64 54 6f 74 61 6c 50 72 69 6e 74 54 69   atedTotalPrintTi
6d 65 5f 6d 73 22 3a 20 37 32 30 30 38 37 38 38   me_ms": 72008788
2e 38 30 33 36 37 33 38 32 2c 0a 20 20 20 20 20   .80367382,.
20 20 20 22 68 69 67 68 4c 65 76 65 6c 53 74 61      "highLevelSta
74 65 22 3a 20 35 2c 0a 20 20                     te": 5,.
```

```text :filename="TCP Printer to Client (10.120.8.38 to 10.120.8.59) | Response with Status pt2" :filehref="./status-response-pt2.txt" :linenos :linenosoverride=0000,0010,0020,0030,0040,0050,0060,....,....,....,....,0220,0230,0240,0250,0260,0270,0280
9c 53 22 86 98 ea 38 0a ab 95 fa 20 08 00 45 02   .S"...8.... ..E.
02 7c e3 ea 40 00 40 06 2f 3f 0a 78 08 26 0a 78   .|..@.@./?.x.&.x
08 3b 00 23 e3 1d 3f d9 2c 48 03 d6 1e 34 80 18   .;.#..?.,H...4..
00 f3 98 33 00 00 01 01 08 0a 16 91 e4 ce 68 61   ...3..........ha
9f 91 20 20 20 20 20 20 22 69 73 41 63 63 65 70   ..      "isAccep
74 69 6e 67 4a 6f 62 73 22 3a 20 74 72 75 65 2c   tingJobs": true,
0a 20 20 20 20 20 20 20 20 22 69 73 44 61 73 68   .        "isDash
...............................................   ................
....... 27 lines truncated for brevity ........   ................
...Click the block label at the top for more...   ................
...............................................   ................
20 20 20 20 7d 2c 0a 20 20 20 20 22 52 65 70 6c       },.    "Repl
79 54 6f 4d 65 74 68 6f 64 22 3a 20 22 50 52 4f   yToMethod": "PRO
54 4f 43 4f 4c 5f 4d 45 54 48 4f 44 5f 47 45 54   TOCOL_METHOD_GET
5f 53 54 41 54 55 53 22 2c 0a 20 20 20 20 22 53   _STATUS",.    "S
75 63 63 65 73 73 22 3a 20 74 72 75 65 2c 0a 20   uccess": true,.
20 20 20 22 56 65 72 73 69 6f 6e 22 3a 20 31 0a      "Version": 1.
7d 0a 00 00 00 00 00 00 00 00                     }.........
```

After a few lines of network handling and cleanup, we process this to a useful JSON object. There is a lot of data provided in these packets, and everything is below, but I have highlighted the lines that I thought were interesting.

```json :highlight={2,17,21,34,35,40,48}
{
  "Id": "{900b362f-c6a1-40dd-aa18-13536b585a1c}",
  "Parameters": {
    "bedTemperature_C": 169.189453125,
    "currentlyRunningJobHeights": [
      {
        "heightColdFills_mm": 3,
        "heightCorePrint_mm": 293.26,
        "heightHotPrecoats_mm": 6.6,
        "heightPostPrint_mm": 0.8800000000000001,
        "jobBundleIndex": 0,
        "jobGuid": "{364dbcb5-f5fe-43ce-866b-be2e8781edb2}"
      }
    ],
    "cylinderLastPrint": {
      "jobGuid": "{364dbcb5-f5fe-43ce-866b-be2e8781edb2}",
      "layersPrinted": 371,
      "metadataUpdateTimestamp": "2026-05-06T00:14:45",
      "printGuid": "{dc8aa5d6-2899-4020-96e6-fc70eaa35c33}",
      "printerSerial": "AquaCardinal",
      "totalLayers": 2666
    },
    "cylinderMaterialCode": "FLP12B01",
    "cylinderMechanicalVersion": 0,
    "cylinderSerial": "BC-FS1-120V-F74NW",
    "cylinderTracking": {
      "numberOfLayers": 11214,
      "numberOfLayersSinceSealReplacement": 11214,
      "numberOfPrints": 0,
      "totalTravelSinceSealReplacement_mm": 21593.8583984375,
      "totalTravel_mm": 21593.8583984375
    },
    "cylinderZAxisRange_mm": 316.9375,
    "estimatedPrintTimeRemaining_ms": 56608354.80367382,
    "estimatedTotalPrintTime_ms": 72008788.80367382,
    "highLevelState": 5,
    "isAcceptingJobs": true,
    "isDashboardRegistrationAllowed": false,
    "isPrimed": false,
    "isPrinting": true,
    "materialCredit_g": -1921,
    "powderLevel": 2,
    "primedTimeout_UnixStamp": 1774239610,
    "printerIssues": [],
    "printerMaterial": "FLP12B01",
    "printingJobGuid": "{dc8aa5d6-2899-4020-96e6-fc70eaa35c33}",
    "printingJobRevision": 0,
    "printingLayer": 372,
    "voltageCode": 0
  },
  "ReplyToMethod": "PROTOCOL_METHOD_GET_STATUS",
  "Success": true,
  "Version": 1
}
```

## Network sniffing: Printer camera feed

The whole goal is to get the printer's camera feed. This one was a bit more challenging to figure out, but starting with network capture:

```text :linenos :linenosoverride=0000,0010,0020,0030,0040,0050,0060,0070 :filename="WS Client to Printer (10.120.8.59 to 10.120.8.38) | Websocket Init"
9c 53 22 86 98 ea 38 0a ab 95 fa 20 08 00 45 00   .S"...8.... ..E.
00 67 d4 04 40 00 40 06 41 3c 0a 78 08 26 0a 78   .g..@.@.A<.x.&.x
08 3b 1f 94 d2 b3 1f 4f a9 cc 44 30 7b 44 80 18   .;.....O..D0{D..
00 eb 84 50 00 00 01 01 08 0a 16 7c 7d 49 29 fb   ...P.......|}I).
3c e8 81 31 7b 22 77 69 64 74 68 22 3a 20 31 32   <..1{"width": 12
38 30 2c 20 22 68 65 69 67 68 74 22 3a 20 31 30   80, "height": 10
32 34 2c 20 22 61 63 74 69 6f 6e 22 3a 20 22 69   24, "action": "i
6e 69 74 22 7d                                    nit"}
```

The rest of the packets were masked or gibberish, but this gave me enough to start experimenting.

```sh
jackcrane@Jacks-MacBook-Air ~ % npx wscat -c ws://10.120.8.38:8084/
Connected (press CTRL+C to quit)
< {"width": 1280, "height": 1024, "action": "init"}
>
```

That just seemed to send the message into a black hole. Then I sent `{"action":"start"}`:

```
> {"action":"start"}
< ����JFIF��C
$.' ",#(7),01444'9=82<.342��C
2!!22222222222222222222222222222222222222222222222222��
���}!1AQa"q2��#B��R��$3br� %&'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz����������������������
```

It's response was a whole lot of gibberish, except for the first line advertising JFIF. We got an image! Finally, all we had to do was pipe those images into a video file, and we would be off!

<video controls autoplay muted>
  <source src="print-trim.mp4">
</video>