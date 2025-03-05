import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Trash2, Filter } from 'lucide-react';
import moment from 'moment';
import { PulseLoader } from 'react-spinners';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

interface Todo {
  id: string;
  task: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  group_id: string;
  archived: boolean;
}

interface Group {
  id: string;
  name: string;
  color: string;
}

interface ActivityData {
  date: string;
  count: number;
}

export function Archive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('user_id', user?.id);

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Fetch archived todos
        const { data: todosData, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user?.id)
          .eq('archived', true)
          .order('created_at', { ascending: false });

        if (todosError) throw todosError;
        setTodos(todosData || []);

        // Process activity data
        const activityMap = new Map<string, number>();
        todosData?.forEach(todo => {
          const date = moment(todo.created_at).format('YYYY-MM-DD');
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        const activity: ActivityData[] = Array.from(activityMap).map(([date, count]) => ({
          date,
          count
        }));

        setActivityData(activity);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const deleteTodo = async (id: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatRelativeTime = (date: string | null) => {
    if (!date) return '';
    return moment(date).format('MMMM D, YYYY');
  };

  const filteredTodos = selectedGroup
    ? todos.filter(todo => todo.group_id === selectedGroup)
    : todos;

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-white hover:text-white/80 transition-colors duration-200"
          >
            <ArrowLeft className="h-6 w-6 mr-2" />
            <span className="text-lg font-medium">Back to Dashboard</span>
          </button>
        </div>

        <div className="glass-effect rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Activity Overview</h2>
          <CalendarHeatmap
            startDate={moment().subtract(1, 'year').toDate()}
            endDate={moment().toDate()}
            values={activityData}
            classForValue={(value) => {
              if (!value) return 'color-empty';
              return `color-scale-${Math.min(value.count, 4)}`;
            }}
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Archived Tasks</h2>
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-white" />
              <select
                value={selectedGroup || ''}
                onChange={(e) => setSelectedGroup(e.target.value || null)}
                className="bg-white/20 text-white border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-white/50"
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <PulseLoader color="white" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTodos.length === 0 ? (
              <div className="glass-effect rounded-xl p-6 text-center text-white">
                No archived tasks found
              </div>
            ) : (
              filteredTodos.map(todo => {
                const group = groups.find(g => g.id === todo.group_id);
                return (
                  <div
                    key={todo.id}
                    className="glass-effect rounded-xl p-6 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group?.color || '#cbd5e1' }}
                          />
                          <span className="text-white font-medium">{todo.task}</span>
                        </div>
                        <div className="mt-2 text-white/60 text-sm">
                          <span>{group?.name || 'No Group'}</span>
                          <span className="mx-2">•</span>
                          <span>Created on {formatRelativeTime(todo.created_at)}</span>
                          {todo.completed_at && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Completed on {formatRelativeTime(todo.completed_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        disabled={processing}
                        className="text-white/60 hover:text-red-400 transition-colors duration-200"
                      >
                        {processing ? <PulseLoader size={8} /> : <Trash2 className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}