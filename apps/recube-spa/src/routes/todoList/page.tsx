import { useRef } from 'react';
import { state, action } from 'recube';

import { cube } from 'recube/react';

const addTodo = action<string>();
const removeTodo = action<{ text: string }>();
const todos = state([{ text: 'Buy groceries' }, { text: 'Walk the dog' }])
  .when(addTodo, (prev, text) => [...prev, { text }])
  .when(removeTodo, (prev, todo) => prev.filter(x => x !== todo));

const TodoList = cube(() => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleClick = () => {
    if (inputRef.current) {
      addTodo(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} />
      <button onClick={handleClick}>Add</button>
      <ul>
        {todos().map((todo, key) => (
          <li key={key}>
            {todo.text} <button onClick={() => removeTodo(todo)}>❌</button>
          </li>
        ))}
      </ul>
    </>
  );
});

export default TodoList;
