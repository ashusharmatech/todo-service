import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, LogOut, Plus, Trash2, Sun, Moon, Clock, Star, StarOff, Calendar } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isTomorrow, isPast, addMinutes } from 'date-fns';

interface Todo {
  id: string;
  task: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  priority: boolean;
  deadline: string | null;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [newTaskPriority, setNewTaskPriority] = useState(false);
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user?.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
      } else {
        setTodos(data || []);
      }
      setLoading(false);
    };

    fetchTodos();

    const channel = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTodos(prev => [payload.new as Todo, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev => prev.filter(todo => todo.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev => prev.map(todo =>
              todo.id === payload.new.id ? payload.new as Todo : todo
            ));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const now = new Date();
    const deadline = newTaskDeadline ? new Date(newTaskDeadline) : null;
    
    // If deadline is set to tomorrow but without time, add default time (9 AM)
    if (deadline && isTomorrow(deadline) && deadline.getHours() === 0) {
      deadline.setHours(9, 0, 0, 0);
    }

    const newTodo = {
      task: newTask,
      user_id: user?.id,
      completed: false,
      priority: newTaskPriority,
      deadline: deadline?.toISOString() || null,
      created_at: now.toISOString()
    };

    const { data, error } = await supabase
      .from('todos')
      .insert([newTodo])
      .select()
      .single();

    if (error) {
      console.error('Error adding todo:', error);
    } else {
      setTodos(prev => [data as Todo, ...prev]);
      setNewTask('');
      setNewTaskPriority(false);
      setNewTaskDeadline('');
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const now = new Date().toISOString();
    
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !completed, completed_at: !completed ? now : null } : todo
      )
    );

    const { error } = await supabase
      .from('todos')
      .update({ 
        completed: !completed,
        completed_at: !completed ? now : null
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating todo:', error);
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, completed: completed, completed_at: completed ? now : null } : todo
        )
      );
    }
  };

  const togglePriority = async (id: string, priority: boolean) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, priority: !priority } : todo
      )
    );

    const { error } = await supabase
      .from('todos')
      .update({ priority: !priority })
      .eq('id', id);

    if (error) {
      console.error('Error updating todo priority:', error);
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, priority: priority } : todo
        )
      );
    }
  };

  const deleteTodo = async (id: string) => {
    const previousTodos = [...todos];
    setTodos(prev => prev.filter(todo => todo.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting todo:', error);
      setTodos(previousTodos);
    }
  };

  const formatRelativeTime = (date: string | null) => {
    if (!date) return '';
    
    try {
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) return '';
      
      if (isToday(targetDate)) {
        return 'Today at ' + format(targetDate, 'h:mm a');
      }
      if (isTomorrow(targetDate)) {
        return 'Tomorrow at ' + format(targetDate, 'h:mm a');
      }
      
      return formatDistanceToNow(targetDate, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    
    if (isPast(deadlineDate) && deadlineDate < now) {
      return 'text-red-500';
    }
    if (isToday(deadlineDate)) {
      return 'text-yellow-500';
    }
    return 'text-green-500';
  };

  const toggleExpand = (id: string) => {
    setExpandedTodoId(expandedTodoId === id ? null : id);
  };

  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'gradient-bg'}`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-white'} tracking-tight`}>
            Task Manager
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${isDark ? 'bg-gray-800 text-yellow-400' : 'bg-white/20 text-white'} 
                hover:scale-110 transition-all duration-200`}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => signOut()}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl
                ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white/20 text-white hover:bg-white/30'}
                transition-all duration-200 hover-scale`}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>

        <form onSubmit={addTodo} className="mb-8 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className={`flex-1 px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500
                ${isDark ? 'bg-gray-800 text-white placeholder-gray-400' : 'bg-white/90 text-gray-900'}
                transition-all duration-200`}
            />
            <button
              type="submit"
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 hover-scale"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add Task
            </button>
          </div>
          <div className="flex gap-4 items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600 rounded"
              />
              <span className={`${isDark ? 'text-white' : 'text-white'}`}>Priority Task</span>
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className={`h-5 w-5 ${isDark ? 'text-white' : 'text-white'}`} />
              <input
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className={`px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500
                  ${isDark ? 'bg-gray-800 text-white' : 'bg-white/90 text-gray-900'}
                  transition-all duration-200`}
              />
            </div>
          </div>
        </form>

        {loading ? (
          <div className={`text-center py-4 ${isDark ? 'text-white' : 'text-white'}`}>Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Active Todos */}
            <section className="animate-slide-in">
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-white'}`}>
                Active Tasks ({activeTodos.length})
              </h2>
              <div className={`rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'glass-effect'}`}>
                {activeTodos.length === 0 ? (
                  <p className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No active tasks
                  </p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {activeTodos.map(todo => (
                      <div 
                        key={todo.id} 
                        onClick={() => toggleExpand(todo.id)}
                        className={`p-4 cursor-pointer ${isDark ? 'hover:bg-gray-700' : 'hover:bg-black/5'} transition-colors duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTodo(todo.id, todo.completed);
                              }}
                              className={`text-gray-400 hover:text-indigo-500 transition-colors duration-200
                                ${isDark ? 'hover:text-indigo-400' : ''}`}
                            >
                              <Circle className="h-5 w-5" />
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePriority(todo.id, todo.priority);
                                  }}
                                  className={`${todo.priority ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500 transition-colors duration-200`}
                                >
                                  {todo.priority ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                                </button>
                                <span className={`${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {todo.task}
                                </span>
                                {todo.deadline && (
                                  <span 
                                    className={`text-sm flex items-center space-x-1 ${getDeadlineStatus(todo.deadline)}`}
                                    title={format(new Date(todo.deadline), 'PPpp')}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    <span>Due {formatRelativeTime(todo.deadline)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTodo(todo.id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors duration-200 ml-4"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        {expandedTodoId === todo.id && (
                          <div className={`mt-3 pl-8 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3" />
                              <span>Created {formatRelativeTime(todo.created_at)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Completed Todos */}
            <section className="animate-slide-in">
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-white'}`}>
                Completed Tasks ({completedTodos.length})
              </h2>
              <div className={`rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'glass-effect'}`}>
                {completedTodos.length === 0 ? (
                  <p className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No completed tasks
                  </p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {completedTodos.map(todo => (
                      <div 
                        key={todo.id} 
                        onClick={() => toggleExpand(todo.id)}
                        className={`p-4 cursor-pointer ${isDark ? 'hover:bg-gray-700' : 'hover:bg-black/5'} transition-colors duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTodo(todo.id, todo.completed);
                              }}
                              className="text-green-500 hover:text-green-600 transition-colors duration-200"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {todo.priority && (
                                  <Star className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className={`line-through ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {todo.task}
                                </span>
                                <span 
                                  className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                  title={todo.completed_at ? format(new Date(todo.completed_at), 'PPpp') : ''}
                                >
                                  • Completed {formatRelativeTime(todo.completed_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTodo(todo.id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors duration-200 ml-4"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        {expandedTodoId === todo.id && (
                          <div className={`mt-3 pl-8 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3" />
                              <span>Created {formatRelativeTime(todo.created_at)}</span>
                            </div>
                            {todo.deadline && (
                              <div className="flex items-center space-x-2 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>Due date was {formatRelativeTime(todo.deadline)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}