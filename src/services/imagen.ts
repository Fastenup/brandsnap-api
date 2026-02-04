/**
 * Image Generation Service using Google Imagen 4
 */

import { GoogleGenAI } from '@google/genai'
import type { Style, Platform, BrandAnalysis } from '../types'

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Supported aspect ratios: 1:1, 9:16, 16:9, 4:3, 3:4
// Map platforms to closest supported ratio
const PLATFORM_ASPECT_RATIO: Record<Platform, string> = {
  twitter: '16:9',   // Twitter 3:1 → use 16:9, crop later if needed
  linkedin: '16:9',  // LinkedIn 4:1 → use 16:9
  youtube: '16:9',   // YouTube 16:9 → exact match
  facebook: '16:9',  // Facebook 2.6:1 → use 16:9
  og: '16:9',        // OG 1.9:1 → use 16:9
}

const STYLE_PROMPTS: Record<Style, string> = {
  blueprint: `Technical blueprint schematic style with dark navy blue background, white/cyan line drawings, circuit patterns, CAD aesthetic, precise geometric shapes. NO photorealism.`,
  brutalism: `Neo-brutalist design with stark black and white base, bold neon accent, thick black borders, high contrast, geometric blocks, punk zine aesthetic.`,
  isometric: `Isometric 3D illustration with true isometric perspective, miniature 3D objects, soft shadows, clean vector-like rendering, limited color palette, playful style.`,
  fluid: `Ethereal glass-morphism with flowing liquid/glass shapes, iridescent gradients, light refractions, dreamy atmosphere, transparent layers, aurora-like colors.`,
  collage: `Mixed media digital collage with layered paper-cut textures, visible edges, photography fragments, vintage meets modern, tactile handmade feel.`,
  explainer: `Flat vector illustration with clean minimal shapes, consistent stroke weights, 3-4 harmonious colors, clear hierarchy, SaaS landing page style.`,
  minimal: `Ultra-minimal design with maximum whitespace, single focal element, monochromatic or 2 colors only, geometric purity, Apple/Muji aesthetic.`,
  gradient: `Aurora gradient design with smooth flowing gradients, 3-4 colors blending, mesh gradient effect, subtle grain texture, soft edges, Stripe aesthetic.`,
  geometric: `Geometric pattern design with repeating interlocking shapes, tessellations, bold color blocking, mathematical precision, Bauhaus influence.`,
  retro: `Retro vintage 70s-80s style with orange/brown/teal/cream palette, halftone dots, sun rays, grain texture, nostalgic warmth, travel poster aesthetic.`,
}

/**
 * Generate banner using Imagen 4
 */
export async function generateBannerWithImagen(
  brandAnalysis: BrandAnalysis,
  platform: Platform,
  style: Style
): Promise<string> {
  const ai = getClient()
  const aspectRatio = PLATFORM_ASPECT_RATIO[platform]
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimal
  const colors = brandAnalysis.brandColors.slice(0, 3).join(', ')

  const prompt = `Create a professional social media banner for "${brandAnalysis.brandName}".

BRAND: ${brandAnalysis.brandName} - ${brandAnalysis.industry || 'modern business'}
DESCRIPTION: ${brandAnalysis.summary || brandAnalysis.slogan || 'Professional brand'}
COLORS TO USE: ${colors || '#3b82f6, #ffffff'}

VISUAL STYLE: ${stylePrompt}

REQUIREMENTS:
- Wide landscape banner composition
- Professional, polished, premium quality
- Create visual interest across the full width
- Use the brand colors prominently throughout
- Abstract or pattern-based design (no literal objects unless style calls for it)
- Suitable for ${platform} header/banner

CRITICAL: 
- NO text, words, letters, numbers, or logos
- NO human faces or recognizable people
- Background/abstract design only`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating ${platform} banner (${aspectRatio}), attempt ${attempt + 1}`)
      
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          aspectRatio: aspectRatio,
          numberOfImages: 1,
        }
      })

      const imageData = response.generatedImages?.[0]?.image?.imageBytes
      if (imageData) {
        console.log(`[Imagen] Successfully generated ${platform} banner`)
        return `data:image/png;base64,${imageData}`
      }
      
      throw new Error('No image data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  console.error(`[Imagen] All attempts failed for ${platform}`)
  throw lastError || new Error('Image generation failed after retries')
}

/**
 * Generate favicon/icon using Imagen 4
 */
export async function generateIconWithImagen(
  brandAnalysis: BrandAnalysis,
  style: Style
): Promise<string> {
  const ai = getClient()
  const primaryColor = brandAnalysis.brandColors[0] || '#3b82f6'
  const secondaryColor = brandAnalysis.brandColors[1] || '#ffffff'
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimal

  // Derive icon concept from brand
  const iconIdea = brandAnalysis.iconConcept || 
    (brandAnalysis.industry?.toLowerCase().includes('verification') ? 'abstract checkmark or shield shape' :
     brandAnalysis.industry?.toLowerCase().includes('finance') ? 'abstract geometric coin or chart shape' :
     brandAnalysis.industry?.toLowerCase().includes('health') ? 'abstract heart or plus symbol' :
     brandAnalysis.industry?.toLowerCase().includes('tech') ? 'abstract circuit or node pattern' :
     brandAnalysis.industry?.toLowerCase().includes('social') ? 'abstract connected dots or speech bubble' :
     'abstract geometric mark')

  const prompt = `Create a premium app icon for "${brandAnalysis.brandName}".

BRAND: ${brandAnalysis.brandName} - ${brandAnalysis.industry || 'technology'}
WHAT IT DOES: ${brandAnalysis.summary || 'Modern digital service'}
ICON CONCEPT: ${iconIdea}

COLORS:
- Primary: ${primaryColor}
- Secondary: ${secondaryColor}

STYLE: ${stylePrompt}

REQUIREMENTS:
- Square 1:1 format, will display at 16px to 512px
- SINGLE focal symbol - one distinctive mark, not multiple objects  
- Must pass "squint test" - recognizable when blurry/small
- Strong silhouette that works in monochrome
- Centered with ~15% padding on all sides
- Crisp, vector-like edges (not fuzzy or painterly)
- App Store / Google Play quality

CRITICAL:
- NO text, words, letters, numbers
- NO generic symbols (gears, lightbulbs, handshakes, globes)
- UNIQUE to this brand - should be distinctive and memorable`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating favicon, attempt ${attempt + 1}`)
      
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          aspectRatio: '1:1',
          numberOfImages: 1,
        }
      })

      const imageData = response.generatedImages?.[0]?.image?.imageBytes
      if (imageData) {
        console.log(`[Imagen] Successfully generated favicon`)
        return `data:image/png;base64,${imageData}`
      }
      
      throw new Error('No icon data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Favicon attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  throw lastError || new Error('Favicon generation failed after retries')
}
