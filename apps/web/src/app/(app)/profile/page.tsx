import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const stats = [
  { label: 'Solved', value: '—' },
  { label: 'Submissions', value: '—' },
  { label: 'Languages', value: '—' },
];

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        description="Your progress, languages and settings. Authentication and the real profile data arrive in 0.5.0."
        eyebrow="Account"
        title="Profile"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card className="border-white/5 bg-white/[0.03]" key={stat.label}>
            <CardHeader>
              <CardDescription className="font-mono text-[11px] uppercase tracking-[0.2em]">
                {stat.label}
              </CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-white/10 bg-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge
              className="border-brand/20 bg-brand/10 text-brand"
              variant="outline"
            >
              Next milestone
            </Badge>
            <span className="font-mono text-[11px] text-slate-500">0.5.0</span>
          </div>
          <CardTitle className="mt-3 text-base">
            Sign in to unlock your profile
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            The login and registration flows, session refresh and protected
            routes are the next step. Until then this shell runs as a guest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">
            The API already supports registration, login, refresh and logout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
