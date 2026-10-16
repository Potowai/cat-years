type SeoOptions = {
  title: string
  description: string
  image?: string
  url?: string
}

const SITE_NAME = 'Cat Years'

export function seo({ title, description, image, url }: SeoOptions) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
  const meta: Array<Record<string, string>> = [
    { title: fullTitle },
    { name: 'description', content: description },
    { name: 'theme-color', content: '#fbf6ea' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
  ]
  if (image) {
    meta.push({ property: 'og:image', content: image })
    meta.push({ name: 'twitter:image', content: image })
  }
  if (url) {
    meta.push({ property: 'og:url', content: url })
  }
  return meta
}
