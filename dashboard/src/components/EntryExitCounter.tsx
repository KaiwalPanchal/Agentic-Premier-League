import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EntryExitCounterProps {
  data: { time: string; entry: number; exit: number }[];
}

export const EntryExitCounter: React.FC<EntryExitCounterProps> = ({ data }) => {
  return (
    <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '8px', height: '100%', minHeight: '300px' }}>
      <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '16px' }}>Entry / Exit Over Time</h3>
      <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }} />
            <Legend />
            <Line type="monotone" dataKey="entry" stroke="#4CAF50" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="exit" stroke="#f44336" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
