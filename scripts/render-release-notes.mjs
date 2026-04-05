import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const packageJsonPath = path.join(root, 'package.json')
const templatePath = path.join(root, 'docs', 'release-notes-template.md')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const template = fs.readFileSync(templatePath, 'utf8')
const version = packageJson.version
const tag = `v${version}`
const repoUrl = 'https://github.com/rlukenbaugh/flight-tracker-pro'
const replacements = {
  '{{VERSION}}': version,
  '{{TAG}}': tag,
  '{{REPO_URL}}': repoUrl,
}

const output = Object.entries(replacements).reduce(
  (content, [token, value]) => content.split(token).join(value),
  template,
)

const outIndex = process.argv.indexOf('--out')

if (outIndex >= 0 && process.argv[outIndex + 1]) {
  const outPath = path.resolve(root, process.argv[outIndex + 1])
  fs.writeFileSync(outPath, output)
  process.stdout.write(`${outPath}\n`)
} else {
  process.stdout.write(output)
}
