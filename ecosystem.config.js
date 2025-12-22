/**
 * PM2 进程管理配置文件
 * 用于生产环境管理 Next.js 应用和 Worker 进程
 * 
 * 使用方法：
 * - 启动：pm2 start ecosystem.config.js
 * - 停止：pm2 stop ecosystem.config.js
 * - 重启：pm2 restart ecosystem.config.js
 * - 查看状态：pm2 status
 * - 查看日志：pm2 logs
 */

module.exports = {
	apps: [
		{
			name: 'linklore-web',
			script: 'pnpm',
			args: '--filter @linklore/web start',
			cwd: process.cwd(),
			instances: 1, // 单实例（2核4GB 建议单实例）
			exec_mode: 'fork',
			env: {
				NODE_ENV: 'production',
				PORT: 3000
			},
			// 日志配置
			error_file: './logs/web-error.log',
			out_file: './logs/web-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			// 自动重启配置
			autorestart: true,
			max_restarts: 10,
			min_uptime: '10s',
			max_memory_restart: '1G', // 内存超过 1GB 自动重启
			// 监听文件变化（生产环境可以关闭）
			watch: false,
			// 忽略监听的文件
			ignore_watch: ['node_modules', 'logs', '.git']
		},
		{
			name: 'linklore-worker',
			script: 'node',
			args: './worker/ai-queue/dist/worker/ai-queue/index.js',
			cwd: process.cwd(),
			instances: 1, // Worker 单实例
			exec_mode: 'fork',
			env: {
				NODE_ENV: 'production'
			},
			// 日志配置
			error_file: './logs/worker-error.log',
			out_file: './logs/worker-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			// 自动重启配置
			autorestart: true,
			max_restarts: 10,
			min_uptime: '10s',
			max_memory_restart: '500M', // Worker 内存限制 500MB
			// 监听文件变化（生产环境关闭）
			watch: false
		},
		{
			name: 'linklore-baike-scheduler',
			script: 'pnpm',
			args: '--filter @linklore/web baike:schedule',
			cwd: process.cwd(),
			instances: 1,
			exec_mode: 'fork',
			env: {
				NODE_ENV: 'production'
			},
			// 日志配置
			error_file: './logs/baike-scheduler-error.log',
			out_file: './logs/baike-scheduler-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			// 自动重启配置
			autorestart: true,
			max_restarts: 10,
			min_uptime: '10s',
			max_memory_restart: '200M'
		}
	]
};

