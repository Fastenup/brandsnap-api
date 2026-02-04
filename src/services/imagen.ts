/**
 * Image Generation Service using Google Imagen 4
 * 
 * Uses the visualPrompt from brand analysis (created by Gemini "Creative Director")
 * to render the actual banner images.
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
const PLATFORM_ASPECT_RATIO: Record<Platform, string> = {
  twitter: '16:9',
  linkedin: '16:9',
  youtube: '16:9',
  facebook: '16:9',
  og: '16:9',
}

/**
 * Generate banner using Imagen 4
 * 
 * Uses the visualPrompt from brand analysis, enhanced with platform-specific details
 */
export async function generateBannerWithImagen(
  brandAnalysis: BrandAnalysis,
  platform: Platform,
  style: Style
): Promise<string> {
  const ai = getClient()
  const aspectRatio = PLATFORM_ASPECT_RATIO[platform]

  // Use the visualPrompt from analysis, or build a fallback
  let prompt: string
  
  if (brandAnalysis.visualPrompt && brandAnalysis.visualPrompt.length > 50) {
    // Use the Creative Director's custom prompt, enhanced for this platform
    prompt = `${brandAnalysis.visualPrompt}

**Platform**: ${platform} banner (${aspectRatio} aspect ratio)
**Format**: Wide landscape, fill entire canvas
**Quality**: 8K, highly detailed, professional marketing asset

**REQUIRED TEXT ELEMENTS** (display exactly as written):
- Brand Name: "${brandAnalysis.brandName}"
- Slogan/Tagline: "${brandAnalysis.slogan || ''}"
${brandAnalysis.cta ? `- CTA Button: "${brandAnalysis.cta}"` : ''}

Typography should be elegant, readable, and integrated into the design.`
  } else {
    // Fallback if no visualPrompt was generated
    const colors = brandAnalysis.brandColors.slice(0, 3).join(', ')
    prompt = `Create a professional ${platform} banner for "${brandAnalysis.brandName}".

Brand: ${brandAnalysis.brandName} - ${brandAnalysis.industry || 'Technology'}
What they do: ${brandAnalysis.summary || 'Modern digital service'}
Tagline: "${brandAnalysis.slogan || 'Innovation for everyone'}"
Colors: ${colors || '#3b82f6, #ffffff'}

Create a ${style} style banner that:
- Explains the brand's value through visual symbolism
- Includes the brand name "${brandAnalysis.brandName}" as elegant typography
- Uses the brand colors throughout
- Fills the entire wide landscape canvas
- Looks like a finished, premium marketing asset

Quality: 8K, highly detailed`
  }

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

  // Map style to icon aesthetic
  const iconStyles: Record<Style, string> = {
    blueprint: 'Technical schematic icon, cyan lines on dark navy, circuit aesthetic',
    brutalism: 'Bold neo-brutalist icon, heavy black borders, neon accent, raw',
    isometric: 'Isometric 3D icon, soft shadows, claymorphism, playful tech',
    fluid: 'Ethereal glass icon, iridescent gradients, flowing organic shape',
    collage: 'Mixed media textured icon, paper-cut layers, artsy creative',
    explainer: 'Flat vector icon, clean minimal shapes, friendly SaaS aesthetic',
    minimal: 'Ultra-minimal geometric icon, one shape, maximum whitespace',
    gradient: 'Aurora gradient icon, smooth flowing colors, modern app style',
    geometric: 'Geometric pattern icon, interlocking shapes, mathematical',
    retro: 'Vintage retro icon, warm 70s colors, halftone texture, nostalgic',
  }

  const prompt = `Create a premium app icon for "${brandAnalysis.brandName}".

Brand: ${brandAnalysis.brandName} - ${brandAnalysis.industry || 'Technology'}
What they do: ${brandAnalysis.summary || 'Digital service'}
Icon concept: ${brandAnalysis.iconConcept || 'abstract symbol'}

Colors: Primary ${primaryColor}, Secondary ${secondaryColor}

Style: ${iconStyles[style] || iconStyles.minimal}

Requirements:
- Square 1:1 format, works at 16px to 512px
- SINGLE distinctive symbol representing "${brandAnalysis.brandName}"
- Can include stylized letter from brand name if appropriate
- Strong silhouette, works in monochrome
- Centered with ~15% padding
- Crisp vector-like edges
- App Store quality

Critical: UNIQUE to this brand, not generic. Memorable and distinctive.`

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
