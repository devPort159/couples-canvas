// src/canvas/PresenceLayer.tsx
type Presence = {
    _id: string;
    userId: string;
    name?: string;
    color?: string;
    cursor?: { x: number; y: number };
};
  
export default function PresenceLayer({ presence }: { presence: Presence[] }) {
	return (
		<div className="pointer-events-none absolute inset-0">
			{presence.map((p) => {
				if (!p.cursor) return null;
				const left = `${p.cursor.x * 100}%`;
				const top = `${p.cursor.y * 100}%`;
				return (
					<div
						key={p._id}
						className="absolute -translate-x-1/2 -translate-y-1/2"
						style={{ left, top }}
					>
						<div
							className="h-3 w-3 rounded-full shadow"
							style={{ background: p.color || "#2563eb" }}
							title={p.name || p.userId}
						/>
					</div>
				);
			})}
		</div>
	);
}