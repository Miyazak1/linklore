'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import ChatFloatingButton from '@/components/ui/ChatFloatingButton';

export default function MainLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isChatPage = pathname?.startsWith('/chat');
	
	return (
		<>
			<Navigation />
			{children}
			{!isChatPage && <Footer />}
			<ChatFloatingButton />
		</>
	);
}










