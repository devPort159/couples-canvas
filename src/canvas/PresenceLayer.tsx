// src/canvas/PresenceLayer.tsx
type PresenceUser = {
	userId: string;
	data?: unknown; // userName from Convex Presence component
};

export default function PresenceLayer({ presence }: { presence: PresenceUser[] }) {
	if (!presence || presence.length === 0) return null;

	return (
		<div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-neutral-200">
			<div className="flex items-center gap-1">
				{/* Green dot indicator */}
				<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
				<span className="text-xs font-medium text-neutral-700">
					{presence.length} {presence.length === 1 ? 'person' : 'people'} viewing
				</span>
			</div>
			{/* Face pile - show up to 3 user initials */}
			<div className="flex -space-x-2">
				{presence.slice(0, 3).map((user, idx) => {
					const userName = String(user.data || 'Anonymous');
					const initials = userName
						.split(' ')
						.map(n => n[0])
						.join('')
						.toUpperCase()
						.slice(0, 2);
					const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
					const color = colors[idx % colors.length];
					
					return (
						<div
							key={user.userId}
							className="h-7 w-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-semibold text-white"
							style={{ backgroundColor: color }}
							title={userName}
						>
							{initials}
						</div>
					);
				})}
				{presence.length > 3 && (
					<div className="h-7 w-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-semibold bg-neutral-400 text-white">
						+{presence.length - 3}
					</div>
				)}
			</div>
		</div>
	);
}

// OLD CURSOR-BASED PRESENCE (commented out)
// type Presence = {
//     _id: string;
//     userId: string;
//     name?: string;
//     color?: string;
//     cursor?: { x: number; y: number };
// };
  
// export default function PresenceLayer({ presence }: { presence: Presence[] }) {
// 	return (
// 		<div className="pointer-events-none absolute inset-0">
// 			{presence.map((p) => {
// 				if (!p.cursor) return null;
// 				const left = `${p.cursor.x * 100}%`;
// 				const top = `${p.cursor.y * 100}%`;
// 				return (
// 					<div
// 						key={p._id}
// 						className="absolute -translate-x-1/2 -translate-y-1/2"
// 						style={{ left, top }}
// 					>
// 						<div
// 							className="h-3 w-3 rounded-full shadow"
// 							style={{ background: p.color || "#2563eb" }}
// 							title={p.name || p.userId}
// 						/>
// 					</div>
// 				);
// 			})}
// 		</div>
// 	);
// }