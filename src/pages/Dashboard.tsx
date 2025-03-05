import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, LogOut, Plus, Trash2, Sun, Moon } from 'lucide-react';

interface Todo {
  id: string;
  task: string;
  completed: boolean;
  created_at: string;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const fetchTodos = async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user?.id)
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
          console.log('Received change:', payload);
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

    const newTodo = {
      task: newTask,
      user_id: user?.id,
      completed: false
    };

    const { data, error } = await supabase
      .from('todos')
      .insert([newTodo])
      .select()
      .single();

    if (error) {
      console.error('Error adding todo:', error);
    } else {
      // Optimistically update the UI
      setTodos(prev => [data as Todo, ...prev]);
      setNewTask('');
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    // Optimistically update the UI
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !completed } : todo
      )
    );

    const { error } = await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id);

    if (error) {
      console.error('Error updating todo:', error);
      // Revert on error
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, completed: completed } : todo
        )
      );
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistically update the UI
    const previousTodos = [...todos];
    setTodos(prev => prev.filter(todo => todo.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting todo:', error);
      // Revert on error
      setTodos(previousTodos);
    }
  };

  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'gradient-bg'}`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-white'} tracking-tight`}>
            My Tasks
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

        <form onSubmit={addTodo} className="mb-8">
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
                        className={`p-4 flex items-center justify-between hover:bg-black/5 transition-colors duration-200
                          ${isDark ? 'hover:bg-gray-700' : ''}`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <button
                            onClick={() => toggleTodo(todo.id, todo.completed)}
                            className={`text-gray-400 hover:text-indigo-500 transition-colors duration-200
                              ${isDark ? 'hover:text-indigo-400' : ''}`}
                          >
                            <Circle className="h-5 w-5 cursor-pointer" />
                          </button>
                          <span 
                            className={`${isDark ? 'text-white' : 'text-gray-900'} flex-1`}
                            onClick={() => toggleTodo(todo.id, todo.completed)}
                            style={{ cursor: 'pointer' }}
                          >
                            {todo.task}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-200 ml-4"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
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
                        className={`p-4 flex items-center justify-between hover:bg-black/5 transition-colors duration-200
                          ${isDark ? 'hover:bg-gray-700' : ''}`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <button
                            onClick={() => toggleTodo(todo.id, todo.completed)}
                            className="text-green-500 hover:text-green-600 transition-colors duration-200"
                          >
                            <CheckCircle2 className="h-5 w-5 cursor-pointer" />
                          </button>
                          <span 
                            className={`line-through ${isDark ? 'text-gray-400' : 'text-gray-500'} flex-1`}
                            onClick={() => toggleTodo(todo.id, todo.completed)}
                            style={{ cursor: 'pointer' }}
                          >
                            {todo.task}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-200 ml-4"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
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