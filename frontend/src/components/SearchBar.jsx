import { useState } from 'react';

export default function SearchBar({ initial = '', onSubmit, placeholder = 'Search by tattoo number or name…', big = false }) {
  const [value, setValue] = useState(initial);

  return (
    <form
      className={`searchbar ${big ? 'big' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
      role="search"
    >
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tattoos"
        maxLength={60}
      />
      <button type="submit" className="btn btn-light">
        Search
      </button>
    </form>
  );
}
