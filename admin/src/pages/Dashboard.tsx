import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  DollarSign,
  ShoppingBag,
  Play,
  ExternalLink
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardLayout } from '../components/DashboardLayout';

// Placeholder series — replace with a real ecosystem-revenue query before launch.
const MOCK_DATA = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

export const Dashboard: React.FC = () => (
  <DashboardLayout>
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Global Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of the MyAppCEO ecosystem.</p>
        <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-warning/10 text-warning">
          Sample data
        </span>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", value: "$124,500", trend: "+12.5%", positive: true, icon: <DollarSign size={20} /> },
          { label: "Active Users", value: "24,802", trend: "+3.2%", positive: true, icon: <Users size={20} /> },
          { label: "Marketplace TTV", value: "$82,000", trend: "-1.5%", positive: false, icon: <ShoppingBag size={20} /> },
          { label: "UGC Viral Links", value: "1,402", trend: "+24%", positive: true, icon: <Play size={20} /> }
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-start text-muted-foreground">
              <div className="p-2 bg-muted rounded-lg">{stat.icon}</div>
              <div className={`flex items-center text-[10px] font-bold ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                {stat.trend} {stat.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-6">
          <h3 className="font-bold text-foreground">Ecosystem Revenue (Weekly)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#0071e3" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground">Approval Queue</h3>
            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">12 ACTION NEEDED</span>
          </div>

          <div className="space-y-4">
            {[
              { type: 'Portfolio', name: 'Alex M.', time: '2m ago' },
              { type: 'UGC Content', name: 'J. Smith', time: '14m ago' },
              { type: 'Marketplace', name: 'Price Change', time: '25m ago' },
              { type: 'Payout Request', name: 'Mike D.', time: '2h ago' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
                    {item.type[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground mb-1">{item.time}</p>
                  <button className="text-[10px] bg-primary hover:opacity-90 text-primary-foreground px-2 py-1 rounded transition-opacity font-bold opacity-0 group-hover:opacity-100">Review</button>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            View All Pending
          </button>
        </div>
      </div>

      {/* Recent Platform Activity */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h3 className="font-bold text-foreground">Recent System Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground uppercase tracking-widest border-b border-border">
              <tr>
                <th className="pb-4 font-bold">Event</th>
                <th className="pb-4 font-bold">Platform</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold">Time</th>
                <th className="pb-4 font-bold text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              {[
                { event: "New Job Posted: 'Voice synthesis App'", platform: "Talents", status: "Active", time: "12:42 PM", ref: "#JOB-4029" },
                { event: "Marketplace Sync: Price Update $39", platform: "Marketplace", status: "Verified", time: "11:15 AM", ref: "#MKT-9921" },
                { event: "Ambassador Cashout Approved: $1,240", platform: "Community", status: "Success", time: "10:30 AM", ref: "#PAY-1002" },
                { event: "New Talent Registered: Data Engineer", platform: "Talents", status: "Pending", time: "09:45 AM", ref: "#TAL-2210" }
              ].map((log, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-4">{log.event}</td>
                  <td className="py-4 font-medium">{log.platform}</td>
                  <td className="py-4">
                    <span className={`font-bold ${log.status === 'Success' || log.status === 'Verified' ? 'text-success' : 'text-warning'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-4 text-muted-foreground">{log.time}</td>
                  <td className="py-4 text-right">
                    <a href="#" className="flex items-center justify-end gap-1 text-primary hover:opacity-80">
                      {log.ref} <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
);
