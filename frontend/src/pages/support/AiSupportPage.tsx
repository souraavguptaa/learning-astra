import { Link } from "react-router-dom";

export function AiSupportPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-3">
      <h1 className="text-2xl font-bold text-slate-800">AI Support</h1>
      <p className="text-slate-500">
        The AI-powered search assistant is being set up and will be available soon. In the meantime, you can raise a
        support ticket and a trainer will help you directly.
      </p>
      <Link to="/my-tickets" className="inline-block rounded-md bg-astra text-white px-4 py-2 text-sm font-medium">
        Go to My Tickets
      </Link>
    </div>
  );
}
