import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, LogOut, Plus, Trash2, Sun, Moon, Clock, Star, StarOff, Calendar, Archive, FolderPlus, Filter } from 'lucide-react';
import moment from 'moment';
import { PulseLoader } from 'react-spinners';

interface Todo {
  id: string;
  task: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  priority: boolean;
  deadline: string | null;
  group_id: string;
  archived: boolean;
}

interface Group {
  id: string;
  name: string;
  is_default: boolean;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [newTaskPriority, setNewTaskPriority] = useState(false);
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('user_id', user?.id)
          .order('is_default', { ascending: false })
          .order('name');

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Set default selected group
        if (groupsData?.length && !selectedGroup) {
          setSelectedGroup(groupsData[0].id);
        }

        // Fetch todos
        const { data: todosData, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user?.id)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (todosError) throw todosError;
        setTodos(todosData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('todos-groups')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
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

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          name: newGroupName.trim(),
          user_id: user?.id,
          is_default: false
        }])
        .select()
        .single();

      if (error) throw error;
      setGroups(prev => [...prev, data]);
      setNewGroupName('');
      setShowNewGroupInput(false);
    } catch (error) {
      console.error('Error adding group:', error);
    } finally {
      setProcessing(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !selectedGroup) return;
    setProcessing(true);

    const now = new Date();
    const deadline = newTaskDeadline ? new Date(newTaskDeadline) : null;
    
    if (deadline && moment(deadline).isSame(moment().add(1, 'day'), 'day') && deadline.getHours() === 0) {
      deadline.setHours(9, 0, 0, 0);
    }

    const newTodo = {
      task: newTask,
      user_id: user?.id,
      completed: false,
      priority: newTaskPriority,
      deadline: deadline?.toISOString() || null,
      created_at: now.toISOString(),
      group_id: selectedGroup,
      archived: false
    };

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([newTodo])
        .select()
        .single();

      if (error) throw error;
      setTodos(prev => [data as Todo, ...prev]);
      setNewTask('');
      setNewTaskPriority(false);
      setNewTaskDeadline('');
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    setProcessing(true);
    const now = new Date().toISOString();
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          completed: !completed,
          completed_at: !completed ? now : null
        })
        .eq('id', id);

      if (error) throw error;
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, completed: !completed, completed_at: !completed ? now : null } : todo
        )
      );
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('todos')
        .update({ archived: !archived })
        .eq('id', id);

      if (error) throw error;
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, archived: !archived } : todo
        )
      );
    } catch (error) {
      console.error('Error archiving todo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const togglePriority = async (id: string, priority: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('todos')
        .update({ priority: !priority })
        .eq('id', id);

      if (error) throw error;
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, priority: !priority } : todo
        )
      );
    } catch (error) {
      console.error('Error updating priority:', error);
    } finally {
      setProcessing(false);
    }
  };

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
    return moment(date).fromNow();
  };

  const getDeadlineStatus = (deadline: string) => {
    const now = moment();
    const deadlineDate = moment(deadline);
    
    if (deadlineDate.isBefore(now)) {
      return 'text-red-500';
    }
    if (deadlineDate.isSame(now, 'day')) {
      return 'text-yellow-500';
    }
    return 'text-green-500';
  };

  const toggleExpand = (id: string) => {
    setExpandedTodoId(expandedTodoId === id ? null : id);
  };

  const filteredTodos = todos.filter(todo => {
    if (showArchived) {
      return todo.archived;
    }
    
    const isInSelectedGroup = !selectedGroup || todo.group_id === selectedGroup;
    const isNotArchived = !todo.archived;
    const isCompletedToday = todo.completed && moment(todo.completed_at).isSame(moment(), 'day');
    
    return isInSelectedGroup && isNotArchived && (!todo.completed || isCompletedToday);
  });

  const activeTodos = filteredTodos.filter(todo => !todo.completed);
  const completedTodos = filteredTodos.filter(todo => todo.completed);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'gradient-bg'}`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-white'} tracking-tight`}>
            Task Manager
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`p-2 rounded-full ${isDark ? 'bg-gray-800 text-blue-400' : 'bg-white/20 text-white'} 
                hover:scale-110 transition-all duration-200 ${showArchived ? 'ring-2 ring-blue-400' : ''}`}
              title="Archive"
            >
              <Archive className="h-5 w-5" />
            </button>
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

        {/* Groups Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className={`h-5 w-5 ${isDark ? 'text-white' : 'text-white'}`} />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-white'}`}>
                Filter by Group
              </h2>
            </div>
            <button
              onClick={() => setShowNewGroupInput(!showNewGroupInput)}
              className={`p-2 rounded-full ${isDark ? 'bg-gray-800 text-green-400' : 'bg-white/20 text-white'} 
                hover:scale-110 transition-all duration-200`}
              title="Add New Group"
            >
              <FolderPlus className="h-5 w-5" />
            </button>
          </div>

          {showNewGroupInput && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500
                  ${isDark ? 'bg-gray-800 text-white placeholder-gray-400' : 'bg-white/90 text-gray-900'}
                  transition-all duration-200`}
              />
              <button
                onClick={addGroup}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
              >
                {processing ? <PulseLoader size={8} color="white" /> : 'Add Group'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id === selectedGroup ? null : group.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${selectedGroup === group.id
                    ? 'bg-indigo-600 text-white'
                    : isDark
                      ? 'bg-gray-800 text-white hover:bg-gray-700'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
              >
                {group.name}
              </button>
            ))}
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
              disabled={processing || !selectedGroup}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 hover-scale
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <PulseLoader size={8} color="white" />
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-1" />
                  Add Task
                </>
              )}
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
          <div className={`text-center py-4 ${isDark ? 'text-white' : 'text-white'}`}>
            <PulseLoader color={isDark ? 'white' : 'white'} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Todos */}
            <section className="animate-slide-in">
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-white'}`}>
                {showArchived ? 'Archived Tasks' : 'Active Tasks'} ({activeTodos.length})
              </h2>
              <div className={`rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'glass-effect'}`}>
                {activeTodos.length === 0 ? (
                  <p className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No {showArchived ? 'archived' : 'active'} tasks
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
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTodo(todo.id, todo.completed);
                              }}
                              disabled={processing}
                              className={`text-gray-400 hover:text-indigo-500 transition-colors duration-200
                                ${isDark ? 'hover:text-indigo-400' : ''} ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {processing ? <PulseLoader size={8} /> : <Circle className="h-5 w-5" />}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePriority(todo.id, todo.priority);
                                  }}
                                  disabled={processing}
                                  className={`${todo.priority ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500 transition-colors duration-200
                                    ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {processing ? <PulseLoader size={8} /> : (todo.priority ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />)}
                                </button>
                                <span className={`${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {todo.task}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {todo.deadline && (
                              <span 
                                className={`text-sm flex items-center space-x-1 ${getDeadlineStatus(todo.deadline)}`}
                                title={moment(todo.deadline).format('LLLL')}
                              >
                                <Calendar className="h-3 w-3" />
                                <span>Due {formatRelativeTime(todo.deadline)}</span>
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArchive(todo.id, todo.archived);
                              }}
                              disabled={processing}
                              className={`text-gray-400 hover:text-blue-500 transition-colors duration-200
                                ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {processing ? <PulseLoader size={8} /> : <Archive className="h-5 w-5" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTodo(todo.id);
                              }}
                              disabled={processing}
                              className={`text-gray-400 hover:text-red-500 transition-colors duration-200
                                ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {processing ? <PulseLoader size={8} /> : <Trash2 className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                        {expandedTodoId === todo.id && (
                          <div className={`mt-3 pl-8 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3" />
                              <span>Created {formatRelativeTime(todo.created_at)}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <FolderPlus className="h-3 w-3" />
                              <span>Group: {groups.find(g => g.id === todo.group_id)?.name || 'Unknown'}</span>
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
            {!showArchived && (
              <section className="animate-slide-in">
                <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-white'}`}>
                  Today's Completed Tasks ({completedTodos.length})
                </h2>
                <div className={`rounded-xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'glass-effect'}`}>
                  {completedTodos.length === 0 ? (
                    <p className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      No completed tasks today
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
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTodo(todo.id, todo.completed);
                                }}
                                disabled={processing}
                                className={`text-green-500 hover:text-green-600 transition-colors duration-200
                                  ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {processing ? <PulseLoader size={8} color="green" /> : <CheckCircle2 className="h-5 w-5" />}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {todo.priority && (
                                    <Star className="h-4 w-4 text-yellow-500" />
                                  )}
                                  <span className={`line-through ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {todo.task}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span 
                                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                title={todo.completed_at ? moment(todo.completed_at).format('LLLL') : ''}
                              >
                                Completed {formatRelativeTime(todo.completed_at)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleArchive(todo.id, todo.archived);
                                }}
                                disabled={processing}
                                className={`text-gray-400 hover:text-blue-500 transition-colors duration-200
                                  ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {processing ? <PulseLoader size={8} /> : <Archive className="h-5 w-5" />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTodo(todo.id);
                                }}
                                disabled={processing}
                                className={`text-gray-400 hover:text-red-500 transition-colors duration-200
                                  ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                 ```
                                {processing ? <PulseLoader size={8} /> : <Trash2 className="h-5 w-5" />}
                              </button>
                            </div>
                          </div>
                          {expandedTodoId === todo.id && (
                            <div className={`mt-3 pl-8 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3" />
                                <span>Created {formatRelativeTime(todo.created_at)}</span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <FolderPlus className="h-3 w-3" />
                                <span>Group: {groups.find(g => g.id === todo.group_id)?.name || 'Unknown'}</span>
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
            )}
          </div>
        )}
      </div>
      <footer className={`py-4 text-center ${isDark ? 'text-white/60' : 'text-white/80'}`}>
        <p className="text-sm">
          Made with ❤️ in India
        </p>
      </footer>
    </div>
  );
}