
export default function PlaceholderView({ title, icon: Icon, description }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fadeIn">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
          {Icon && <Icon className="w-9 h-9 text-blue-300" />}
        </div>
        <h2 className="text-xl font-extrabold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
          {description || 'This feature is coming soon. Stay tuned for updates!'}
        </p>
      </div>
    </div>
  );
}
