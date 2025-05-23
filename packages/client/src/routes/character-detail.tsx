import React from 'react';
import { useParams, Link } from 'react-router-dom';

const CharacterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // This is a placeholder component - in a real implementation,
  // you would fetch character data from an API based on the ID
  const character = {
    id,
    name: `Character ${id}`,
    description: 'This is a character description.',
    traits: ['Friendly', 'Intelligent', 'Curious'],
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-6">{character.name}</h1>
      <div className="grid gap-4">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Character Details</h2>
          <p className="text-muted-foreground">ID: {character.id}</p>
          <p className="mt-2">{character.description}</p>

          <h3 className="text-xl lg:text-2xl font-semibold tracking-tight mt-4">Traits</h3>
          <ul className="list-disc pl-5">
            {character.traits.map((trait, index) => (
              <li key={index}>{trait}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to={`/characters/${id}/edit`}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Edit Character
        </Link>
        <Link
          to="/characters"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to List
        </Link>
      </div>
    </div>
  );
};

export default CharacterDetail;
