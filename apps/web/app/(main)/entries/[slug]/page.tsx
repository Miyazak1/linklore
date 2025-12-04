'use client';

import { useParams } from 'next/navigation';
import EntryDetail from '@/components/entry/EntryDetail';

export default function EntryDetailPage() {
	const params = useParams();
	const slug = params.slug as string;

	return <EntryDetail slug={slug} />;
}

