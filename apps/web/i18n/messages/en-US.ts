export default {
	common: {
		appName: "LinkLore",
		appDescription: "Small-scale academic discussion platform (documents as topics)",
		loading: "Loading...",
		error: "Error",
		success: "Success",
		cancel: "Cancel",
		confirm: "Confirm",
		save: "Save",
		delete: "Delete",
		edit: "Edit",
		search: "Search",
		upload: "Upload",
		download: "Download",
		back: "Back"
	},
	nav: {
		home: "Home",
		upload: "Create Topic (Upload Document)",
		library: "Public Library",
		practices: "Practices",
		aiSettings: "My AI",
		shelf: "My Shelf"
	},
	home: {
		title: "LinkLore",
		subtitle: "Small-scale academic discussion platform (documents as topics)",
		stats: {
			topics: "Topics",
			documents: "Documents",
			users: "Users",
			books: "Books"
		},
		latestTopics: "Latest Topics"
	},
	topic: {
		title: "Topic",
		author: "Author",
		createdAt: "Created at",
		documentCount: "Documents",
		blindReview: "Blind review in progress (author hidden for first 48 hours)",
		anonymous: "Anonymous",
		originalDocument: "Original Document",
		responseDocuments: "Response Documents",
		uploadResponse: "Upload Response Document",
		exportZip: "Export Topic Bundle ZIP",
		exportMarkdown: "Export Markdown",
		downloadOriginal: "Download Original Document"
	},
	upload: {
		title: "Create Topic",
		description: "Supported: doc, docx, txt, md, pdf, rtf (single file ≤ 20MB)",
		uploading: "Uploading...",
		success: "Upload successful!",
		error: "Upload failed"
	},
	auth: {
		signin: "Sign In",
		signup: "Sign Up",
		signout: "Sign Out",
		email: "Email",
		password: "Password",
		inviteCode: "Invitation Code",
		loginSuccess: "Login successful",
		loginFailed: "Login failed",
		registerSuccess: "Registration successful",
		registerFailed: "Registration failed"
	},
	ai: {
		title: "My AI",
		provider: "Provider",
		model: "Model",
		apiKey: "API Key",
		apiEndpoint: "API Endpoint",
		testConnection: "Test Connection",
		saveConfig: "Save Configuration",
		usage: "Monthly Usage"
	},
	library: {
		title: "Public Library",
		description: "Search and add books to the public library, or upload e-book files. All users can see them.",
		addToShelf: "Add to Shelf",
		removeFromShelf: "Remove from Shelf",
		readOnline: "Read Online",
		download: "Download"
	},
	evaluation: {
		title: "AI Evaluation",
		discipline: "Discipline",
		structure: "Structure",
		logic: "Logic",
		viewpoint: "Viewpoint",
		evidence: "Evidence",
		citation: "Citation",
		generating: "Evaluation generating, please wait..."
	},
	consensus: {
		title: "Consensus Analysis",
		consensus: "Consensus",
		disagreements: "Disagreements",
		unverified: "Unverified",
		needMoreDocs: "At least 2 documents are required for consensus analysis",
		hint: "Tip: You can upload multiple documents (can be from the same user) to test the consensus analysis feature. AI will automatically analyze viewpoints in documents and identify consensus and disagreement points."
	},
	quality: {
		title: "Quality Signals",
		rigor: "Rigor",
		clarity: "Clarity",
		citationCompleteness: "Citation Completeness",
		originality: "Originality",
		notRated: "Not Rated"
	},
	theme: {
		toggle: "Toggle Theme",
		light: "Light",
		dark: "Dark"
	}
} as const;










