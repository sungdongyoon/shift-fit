/** WDS v1. Figma: https://www.figma.com/design/JkhTTv00jkP495WK1oXcXf */
export const palette = {
  "common/100": "#FFFFFF",
  "common/0": "#000000",
  "blue/10": "#001536",
  "blue/20": "#002966",
  "blue/30": "#003E9C",
  "blue/40": "#0054D1",
  "blue/45": "#005EEB",
  "blue/50": "#0066FF",
  "blue/60": "#3385FF",
  "blue/70": "#69A5FF",
  "blue/80": "#9EC5FF",
  "blue/90": "#C9DEFE",
  "blue/95": "#EAF2FE",
  "blue/99": "#F7FBFF",
  "neutral/5": "#0F0F10",
  "neutral/10": "#171719",
  "neutral/15": "#1B1C1E",
  "neutral/17": "#212225",
  "neutral/20": "#292A2D",
  "neutral/25": "#37383C",
  "neutral/30": "#46474C",
  "neutral/40": "#5A5C63",
  "neutral/50": "#70737C",
  "neutral/60": "#878A93",
  "neutral/70": "#989BA2",
  "neutral/80": "#AEB0B6",
  "neutral/90": "#C2C4C8",
  "neutral/95": "#DBDCDF",
  "neutral/97": "#EAEBEC",
  "neutral/98": "#F4F4F5",
  "neutral/99": "#F7F7F8",
  "green/10": "#00240C",
  "green/30": "#006E25",
  "green/70": "#49E57D",
  "green/95": "#D9FFE6",
  "red/10": "#3B0101",
  "red/30": "#B00C0C",
  "red/70": "#FF8C8C",
  "red/95": "#FEECEC",
  "orange/10": "#361E00",
  "orange/30": "#9C5800",
  "orange/70": "#FFC06E",
  "orange/95": "#FEF4E6"
} as const;
export const semanticTokens = {
  "bg/canvas": {
    "light": "#FFFFFF",
    "dark": "#171719"
  },
  "bg/subtle": {
    "light": "#F7F7F8",
    "dark": "#0F0F10"
  },
  "bg/surface": {
    "light": "#FFFFFF",
    "dark": "#212225"
  },
  "bg/hover": {
    "light": "#F4F4F5",
    "dark": "#292A2D"
  },
  "text/primary": {
    "light": "#171719",
    "dark": "#F7F7F8"
  },
  "text/secondary": {
    "light": "#5A5C63",
    "dark": "#AEB0B6"
  },
  "text/tertiary": {
    "light": "#70737C",
    "dark": "#989BA2"
  },
  "text/disabled": {
    "light": "#AEB0B6",
    "dark": "#5A5C63"
  },
  "text/on-brand": {
    "light": "#FFFFFF",
    "dark": "#FFFFFF"
  },
  "brand/solid": {
    "light": "#0066FF",
    "dark": "#0066FF"
  },
  "brand/hover": {
    "light": "#005EEB",
    "dark": "#005EEB"
  },
  "brand/pressed": {
    "light": "#0054D1",
    "dark": "#0054D1"
  },
  "brand/text": {
    "light": "#005EEB",
    "dark": "#69A5FF"
  },
  "brand/subtle": {
    "light": "#EAF2FE",
    "dark": "#001536"
  },
  "border/default": {
    "light": "#DBDCDF",
    "dark": "#46474C"
  },
  "border/input": {
    "light": "#878A93",
    "dark": "#70737C"
  },
  "border/focus": {
    "light": "#0066FF",
    "dark": "#69A5FF"
  },
  "fill/disabled": {
    "light": "#F4F4F5",
    "dark": "#292A2D"
  },
  "status/success": {
    "light": "#006E25",
    "dark": "#49E57D"
  },
  "status/success-bg": {
    "light": "#D9FFE6",
    "dark": "#00240C"
  },
  "status/danger": {
    "light": "#B00C0C",
    "dark": "#FF8C8C"
  },
  "status/danger-bg": {
    "light": "#FEECEC",
    "dark": "#3B0101"
  },
  "status/warning": {
    "light": "#9C5800",
    "dark": "#FFC06E"
  },
  "status/warning-bg": {
    "light": "#FEF4E6",
    "dark": "#361E00"
  }
} as const;
export type Theme = 'light' | 'dark';
export type ColorToken = keyof typeof semanticTokens;
export const spacing = [0,2,4,8,12,16,20,24,32,40,48,64,80] as const;
export const radii = [0, 4, 8, 12, 16, 24, 999] as const;
export const breakpoints = { sm: 768, md: 992, lg: 1200, xl: 1600 } as const;
export const fontFamily = 'Noto Sans KR';
export const typography = {
  "Display": {
    "fontSize": 40,
    "lineHeight": 52,
    "letterSpacingEm": -0.0282,
    "fontWeight": 700
  },
  "Title 1": {
    "fontSize": 32,
    "lineHeight": 44,
    "letterSpacingEm": -0.0253,
    "fontWeight": 700
  },
  "Title 2": {
    "fontSize": 28,
    "lineHeight": 38,
    "letterSpacingEm": -0.0236,
    "fontWeight": 700
  },
  "Title 3": {
    "fontSize": 24,
    "lineHeight": 32,
    "letterSpacingEm": -0.023,
    "fontWeight": 700
  },
  "Heading": {
    "fontSize": 20,
    "lineHeight": 28,
    "letterSpacingEm": -0.012,
    "fontWeight": 500
  },
  "Headline": {
    "fontSize": 18,
    "lineHeight": 26,
    "letterSpacingEm": -0.002,
    "fontWeight": 500
  },
  "Body": {
    "fontSize": 16,
    "lineHeight": 24,
    "letterSpacingEm": 0.005699999999999999,
    "fontWeight": 400
  },
  "Body strong": {
    "fontSize": 16,
    "lineHeight": 24,
    "letterSpacingEm": 0.005699999999999999,
    "fontWeight": 500
  },
  "Body small": {
    "fontSize": 15,
    "lineHeight": 22,
    "letterSpacingEm": 0.0096,
    "fontWeight": 400
  },
  "Label": {
    "fontSize": 14,
    "lineHeight": 20,
    "letterSpacingEm": 0.014499999999999999,
    "fontWeight": 500
  },
  "Caption": {
    "fontSize": 12,
    "lineHeight": 16,
    "letterSpacingEm": 0.0252,
    "fontWeight": 400
  }
} as const;

