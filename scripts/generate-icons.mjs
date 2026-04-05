import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')

const svgPath = path.join(root, 'build', 'app-icon.svg')
const outputDir = path.join(root, 'build', 'icons')
const publicDir = path.join(root, 'public')

await fs.mkdir(outputDir, { recursive: true })

const svgBuffer = await fs.readFile(svgPath)

const icoPath = path.join(outputDir, 'icon.ico')
const faviconPath = path.join(publicDir, 'favicon.png')
const iconSizes = [16, 24, 32, 48, 64, 128, 256]

await sharp(svgBuffer).resize(128, 128).png().toFile(faviconPath)

const pngPaths = await Promise.all(
  iconSizes.map(async (size) => {
    const output = path.join(outputDir, `icon-${size}.png`)
    await sharp(svgBuffer).resize(size, size).png().toFile(output)
    return output
  }),
)

const icoBuffer = await pngToIco(pngPaths)
await fs.writeFile(icoPath, icoBuffer)

console.log(`Generated icons in ${outputDir}`)
