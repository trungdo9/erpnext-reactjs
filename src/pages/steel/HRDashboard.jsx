import { useState, useEffect, useCallback } from 'react';
import { Users, CalendarOff, Building2, Briefcase } from 'lucide-react';
import { db } from '../../api/frappeClient';
import DashboardLayout from '../../components/workspace/DashboardLayout';

export default function HRDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ employees: 0, pendingLeaves: 0, departments: 0, designations: 0 });
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await Promise.allSettled([
        db.getDocList('Employee', { filters: [['status', '=', 'Active']], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Leave Application', { filters: [['status', '=', 'Open']], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Department', { fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Designation', { fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Employee', {
          filters: [['status', '=', 'Active']],
          fields: ['name', 'employee_name', 'department', 'designation', 'status'],
          orderBy: { field: 'creation', order: 'desc' },
          limit: 15,
        }),
      ]);
      setStats({
        employees: r[0].status === 'fulfilled' ? r[0].value : 0,
        pendingLeaves: r[1].status === 'fulfilled' ? r[1].value : 0,
        departments: r[2].status === 'fulfilled' ? r[2].value : 0,
        designations: r[3].status === 'fulfilled' ? r[3].value : 0,
      });
      if (r[4].status === 'fulfilled') setRows(r[4].value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout
      kpis={[
        { icon: Users, value: stats.employees, label: 'Tổng nhân viên', color: 'blue' },
        { icon: CalendarOff, value: stats.pendingLeaves, label: 'Nghỉ phép chờ duyệt', color: 'orange' },
        { icon: Building2, value: stats.departments, label: 'Phòng ban', color: 'green' },
        { icon: Briefcase, value: stats.designations, label: 'Chức danh', color: 'purple' },
      ]}
      loading={loading}
      tableTitle="Nhân viên gần đây"
      tableLink={{ label: 'Xem tất cả', path: '/form/Employee' }}
      columns={[
        { key: 'name', label: 'Mã NV' },
        { key: 'employee_name', label: 'Họ tên' },
        { key: 'department', label: 'Phòng ban' },
        { key: 'designation', label: 'Chức danh' },
        { key: 'status', label: 'Trạng thái' },
      ]}
      rows={rows}
      renderRow={r => (
        <tr key={r.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-2.5 font-medium text-blue-600">{r.name}</td>
          <td className="px-4 py-2.5">{r.employee_name}</td>
          <td className="px-4 py-2.5">{r.department}</td>
          <td className="px-4 py-2.5">{r.designation}</td>
          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{r.status}</span></td>
        </tr>
      )}
    />
  );
}
