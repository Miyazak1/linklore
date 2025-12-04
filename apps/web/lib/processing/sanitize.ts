import sanitizeHtml from 'sanitize-html';

export function cleanHtml(dirty: string) {
	return sanitizeHtml(dirty, {
		allowedTags: [
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'p',
			'blockquote',
			'pre',
			'code',
			'ul',
			'ol',
			'li',
			'strong',
			'em',
			'a',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'img',
			'hr',
			'br',
			'span',
			'div'
		],
		allowedAttributes: {
			a: ['href', 'name', 'target', 'rel'],
			img: ['src', 'alt'],
			'*': ['class']
		},
		allowedSchemes: ['data'],
		allowedSchemesByTag: {
			img: ['data']
		},
		allowProtocolRelative: false,
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noreferrer noopener' })
		},
		enforceHtmlBoundary: true
	});
}











