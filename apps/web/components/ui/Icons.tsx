'use client';

import { 
	Home, 
	MessageSquare, 
	Search, 
	BookOpen, 
	Library, 
	BarChart3,
	MessageCircle,
	Link2,
	FileText,
	HelpCircle,
	RefreshCw,
	Book,
	BookMarked,
	Target,
	Menu,
	X,
	User,
	Settings,
	LogOut,
	LogIn,
	ChevronDown,
	ChevronUp,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Mail,
	Globe,
	Users as Handshake,
	TrendingUp,
	Upload,
	Camera,
	Image as ImageIconLucide,
	Plus,
	Trash2,
	Minus,
	Users,
	CheckCircle,
	Database,
	Clock,
	Rocket,
	XCircle,
	Sparkles,
	Loader2,
	Shield,
	Filter
} from 'lucide-react';

interface IconProps {
	size?: number | string;
	color?: string;
	className?: string;
	style?: React.CSSProperties;
}

// 导航图标
export const HomeIcon = (props: IconProps) => <Home {...props} />;
export const MessageIcon = (props: IconProps) => <MessageSquare {...props} />;
export const SearchIcon = (props: IconProps) => <Search {...props} />;
export const BookIcon = (props: IconProps) => <BookOpen {...props} />;
export const LibraryIcon = (props: IconProps) => <Library {...props} />;
export const ChartIcon = (props: IconProps) => <BarChart3 {...props} />;
export const ChatIcon = (props: IconProps) => <MessageCircle {...props} />;
export const LinkIcon = (props: IconProps) => <Link2 {...props} />;
export const FileIcon = (props: IconProps) => <FileText {...props} />;
export const QuestionIcon = (props: IconProps) => <HelpCircle {...props} />;
export const RefreshIcon = (props: IconProps) => <RefreshCw {...props} />;
export const BookMarkedIcon = (props: IconProps) => <BookMarked {...props} />;
export const TargetIcon = (props: IconProps) => <Target {...props} />;
export const HandshakeIcon = (props: IconProps) => <Handshake {...props} />;
export const TrendingUpIcon = (props: IconProps) => <TrendingUp {...props} />;
export const UploadIcon = (props: IconProps) => <Upload {...props} />;
export const CameraIcon = (props: IconProps) => <Camera {...props} />;
export const ImageIconComponent = (props: IconProps) => <ImageIconLucide {...props} />;
export const PlusIcon = (props: IconProps) => <Plus {...props} />;
export const TrashIcon = (props: IconProps) => <Trash2 {...props} />;
export const MinusIcon = (props: IconProps) => <Minus {...props} />;
export const UsersIcon = (props: IconProps) => <Users {...props} />;
export const CheckCircleIcon = (props: IconProps) => <CheckCircle {...props} />;
export const DatabaseIcon = (props: IconProps) => <Database {...props} />;
export const ClockIcon = (props: IconProps) => <Clock {...props} />;
export const RocketIcon = (props: IconProps) => <Rocket {...props} />;
export const XCircleIcon = (props: IconProps) => <XCircle {...props} />;
export const SparklesIcon = (props: IconProps) => <Sparkles {...props} />;
export const LoadingSpinner = (props: IconProps) => <Loader2 {...props} style={{ ...props.style, animation: 'spin 1s linear infinite' }} />;
export const ShieldIcon = (props: IconProps) => <Shield {...props} />;
export const FilterIcon = (props: IconProps) => <Filter {...props} />;

// UI 图标
export const MenuIcon = (props: IconProps) => <Menu {...props} />;
export const CloseIcon = (props: IconProps) => <X {...props} />;
export const UserIcon = (props: IconProps) => <User {...props} />;
export const SettingsIcon = (props: IconProps) => <Settings {...props} />;
export const LogOutIcon = (props: IconProps) => <LogOut {...props} />;
export const LogInIcon = (props: IconProps) => <LogIn {...props} />;
export const ChevronDownIcon = (props: IconProps) => <ChevronDown {...props} />;
export const ChevronUpIcon = (props: IconProps) => <ChevronUp {...props} />;
export const ChevronLeftIcon = (props: IconProps) => <ChevronLeft {...props} />;
export const ChevronRightIcon = (props: IconProps) => <ChevronRight {...props} />;
export { ExternalLink, Mail, Globe };

// 图标映射（用于替换emoji）
export const iconMap: Record<string, React.ComponentType<IconProps>> = {
	'🏠': HomeIcon,
	'💬': MessageIcon,
	'🔍': SearchIcon,
	'📖': BookIcon,
	'📚': LibraryIcon,
	'📊': ChartIcon,
	'🔗': LinkIcon,
	'📝': FileIcon,
	'❓': QuestionIcon,
	'🔄': RefreshIcon,
	'📔': BookMarkedIcon,
	'🎯': TargetIcon,
};

// 通用图标组件
interface IconComponentProps extends IconProps {
	name: string;
}

export function Icon({ name, size = 20, color, ...props }: IconComponentProps) {
	const IconComponent = iconMap[name];
	if (!IconComponent) {
		// 如果没有找到对应的图标，返回emoji作为后备
		return <span style={{ fontSize: size, color }}>{name}</span>;
	}
	return <IconComponent size={size} color={color} {...props} />;
}

