export type Platform = 'twitter' | 'linkedin' | 'youtube' | 'facebook' | 'og'

export type Style = 
  | 'blueprint' 
  | 'brutalism' 
  | 'isometric' 
  | 'fluid' 
  | 'collage' 
  | 'explainer'
  | 'minimal'
  | 'gradient'
  | 'geometric'
  | 'retro'

export interface BrandAnalysis {
  brandName: string
  summary: string
  industry: string | null
  vibe: string
  brandColors: string[]
  visualPrompt: string
  iconConcept?: string
  visualMetaphors?: string[]
  slogan?: string
  cta?: string
  title?: string
  twitterBio?: string
  linkedinHeadline?: string
}

export interface GenerationRequest {
  url?: string
  description?: string
  platforms: (Platform | 'favicon' | 'logo')[]
  style: Style
  customColors?: string[]
  variants?: number
  includeFavicon?: boolean
}

export interface GeneratedAsset {
  platform: Platform | 'favicon' | 'logo'
  dimensions: { width: number; height: number }
  base64: string
  url?: string
  variant?: number
}

export interface GenerationResult {
  success: boolean
  assets: GeneratedAsset[]
  brandAnalysis?: Partial<BrandAnalysis>
  error?: string
}

export const PLATFORM_DIMENSIONS: Record<Platform | 'favicon' | 'logo', { width: number; height: number }> = {
  twitter: { width: 1500, height: 500 },
  linkedin: { width: 1584, height: 396 },
  youtube: { width: 2560, height: 1440 },
  facebook: { width: 820, height: 312 },
  og: { width: 1200, height: 630 },
  favicon: { width: 512, height: 512 },
  logo: { width: 1024, height: 1024 },
}
