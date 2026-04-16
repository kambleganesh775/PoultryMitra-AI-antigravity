import React from 'react';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { TrashItem } from '../types';
import { Trash2, RotateCcw, AlertOctagon, Archive, Loader2 } from 'lucide-react';

const TrashBin: React.FC = () => {
  const { trash, isLoading } = useData();

  const handleRestore = (id: string) => {
    if (window.confirm("Restore this item?")) {
      dataService.restoreFromTrash(id);
    }
  };

  const handleDeleteForever = (id: string) => {
    if (window.confirm("PERMANENTLY DELETE this item? This action cannot be undone.")) {
      dataService.deleteFromTrash(id);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  const sortedTrash = [...trash].sort((a, b) => new Date(b.deletedDate).getTime() - new Date(a.deletedDate).getTime());

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Archive className="text-orange-600"/> Trash & Recovery
          </h1>
          <p className="text-gray-500 text-sm">Recover deleted items or remove them permanently.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {sortedTrash.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <Trash2 size={48} className="mb-4 opacity-20" />
            <p className="text-lg">Trash is empty</p>
            <p className="text-sm">Deleted items will appear here for recovery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-4">Type</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Deleted On</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTrash.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/10 transition-colors">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        item.type === 'Batch' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        item.type === 'Sale' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-800">
                      {item.description}
                      <p className="text-xs text-gray-400 font-normal">Original ID: {item.originalId}</p>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(item.deletedDate).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleRestore(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-bold transition-colors"
                          title="Restore Item"
                        >
                          <RotateCcw size={14}/> Restore
                        </button>
                        <button 
                          onClick={() => handleDeleteForever(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                          title="Delete Forever"
                        >
                          <AlertOctagon size={14}/> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashBin;