# frozen_string_literal: true
require 'rouge'

module Rouge
  module Lexers
    class Metar < RegexLexer
      title 'METAR'
      desc 'Aviation routine weather reports (METAR/SPECI)'
      tag 'metar'
      aliases 'speci'
      mimetypes 'text/x-metar'

      # A group ends at whitespace, "=" or end of line
      EOT = /(?=\s|=|$)/

      state :root do
        rule %r/\s+/, Text
        rule %r/=/, Punctuation

        rule %r/(?:METAR|SPECI|COR|AUTO)#{EOT}/, Keyword::Reserved
        rule %r/\d{6}Z#{EOT}/, Literal::Date                          # 161351Z
        rule %r/(?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?(?:KT|MPS|KMH)#{EOT}/, Name::Variable  # wind
        rule %r/\d{3}V\d{3}#{EOT}/, Name::Variable                    # variable wind dir

        rule %r/(?:CAVOK|NOSIG|SKC|CLR|NSC|NCD)#{EOT}/, Keyword::Constant
        rule %r/(?:TEMPO|BECMG)#{EOT}/, Keyword

        # visibility: 10SM, M1/4SM, 1 1/2SM, 9999
        rule %r/\d(?=\s\d\/\dSM)/, Literal::Number::Integer
        rule %r/[MP]?\d+(?:\/\d+)?SM#{EOT}/, Literal::Number
        rule %r/\d{4}(?:NDV)?#{EOT}/, Literal::Number

        # RVR: R28L/2400FT, R10/M0600V1000U
        rule %r/R\d{2}[LCR]?\/[PM]?\d{4}(?:V[PM]?\d{4})?(?:FT|[UDN])?#{EOT}/, Name::Tag

        # present weather: -RA, +TSRA, VCSH, BR, FZFG
        rule %r/[-+]?(?:VC)?(?:MI|BC|PR|DR|BL|SH|TS|FZ)?(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+#{EOT}/, Generic::Emph

        # sky condition: FEW040, BKN250CB, VV002
        rule %r/(?:FEW|SCT|BKN|OVC|VV)(?:\d{3}|\/{3})(?:CB|TCU)?#{EOT}/, Name::Builtin

        rule %r/M?\d{2}\/(?:M?\d{2})?#{EOT}/, Literal::Number::Float  # temp/dewpoint
        rule %r/[AQ]\d{4}#{EOT}/, Literal::Number::Integer            # altimeter

        rule %r/RMK#{EOT}/, Keyword, :remarks

        rule %r/[A-Z][A-Z0-9]{3}#{EOT}/, Name::Class                  # ICAO station (keep late!)
        rule %r/\S+/, Text
      end

      state :remarks do
        rule %r/\n/, Text, :pop!
        rule %r/=/, Punctuation, :pop!
        rule %r/[ \t]+/, Text
        rule %r/(?:AO[12]|SLP\d{3})#{EOT}/, Name::Builtin
        rule %r/T[01]\d{3}[01]\d{3}#{EOT}/, Literal::Number::Float
        rule %r/\S+/, Comment
      end
    end
  end
end