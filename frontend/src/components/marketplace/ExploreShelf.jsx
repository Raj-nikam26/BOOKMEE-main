import { useState } from "react";
import { homeStyles as s } from "../../assets/marketplaceStyles";
import Shelf from "./Shelf";

/**
 * Several shelves in the space of one: a row of tabs picks which list is shown.
 * Keeps the home page short while every list stays one tap away.
 */
export default function ExploreShelf({ shelves }) {
  const [activeId, setActiveId] = useState(shelves[0]?.id);
  // The list of shelves can change (e.g. after logging in); fall back to the first.
  const active = shelves.find((shelf) => shelf.id === activeId) || shelves[0];

  if (!active) return null;

  return (
    <Shelf
      key={active.id}
      title="Explore"
      subtitle={active.subtitle}
      items={active.items}
    >
      <div className={`${s.chips} mt-3`} role="tablist" aria-label="Explore">
        {shelves.map((shelf) => (
          <button
            key={shelf.id}
            type="button"
            role="tab"
            aria-selected={shelf.id === active.id}
            onClick={() => setActiveId(shelf.id)}
            className={`${s.chip} ${shelf.id === active.id ? s.chipActive : s.chipInactive}`}
          >
            {shelf.tab}
          </button>
        ))}
      </div>
    </Shelf>
  );
}
