import { useState, useRef, useEffect, useCallback } from 'react';
import {
  TableData, TableColumn, TableRow, TableSort, TableFilter,
  ColumnType, SelectOption, CellValue, Block
} from '../../../types/types';
import {
  Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter, X
} from 'lucide-react';
import { UrlCell } from './cells/UrlCell';
import { SelectCell } from './cells/SelectCell';
import { createDefaultTable, generateId, getColumnIcon } from './utils';
import { TextCell } from './cells/TextCell';
import { NumberCell } from './cells/NumberCell';
import { DateCell } from './cells/DateCell';
import { CheckboxCell } from './cells/CheckboxCell';
import { ColumnHeaderMenu } from './ColumnHeaderMenu';
import { TablePortal } from './TablePortal';


// ─── Main Table Block ─────────────────────────────────────────

interface TableBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
}

export default function TableBlock({ block, onUpdate }: TableBlockProps) {
  const [tableData, setTableData] = useState<TableData>(
    block.tableData || createDefaultTable()
  );
  const [sort, setSort] = useState<TableSort | null>(null);
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [menuTrigger, setMenuTrigger] = useState<HTMLElement | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Sync to parent
  const syncToParent = useCallback(
    (data: TableData) => {
      setTableData(data);
      onUpdate({ ...block, tableData: data });
    },
    [block, onUpdate]
  );

  // ─── Column Operations ───────

  const addColumn = () => {
    const newCol: TableColumn = {
      id: generateId(),
      name: `Column ${tableData.columns.length + 1}`,
      type: 'text',
      width: 150,
    };
    syncToParent({ ...tableData, columns: [...tableData.columns, newCol] });
  };

  const updateColumn = (colId: string, updates: Partial<TableColumn>) => {
    const columns = tableData.columns.map((c) =>
      c.id === colId ? { ...c, ...updates } : c
    );
    syncToParent({ ...tableData, columns });
  };

  const deleteColumn = (colId: string) => {
    if (tableData.columns.length <= 1) return;
    const columns = tableData.columns.filter((c) => c.id !== colId);
    const rows = tableData.rows.map((r) => {
      const cells = { ...r.cells };
      delete cells[colId];
      return { ...r, cells };
    });
    syncToParent({ ...tableData, columns, rows });
    setEditingColumnId(null);
  };

  const changeColumnType = (colId: string, newType: ColumnType) => {
    const columns = tableData.columns.map((c) =>
      c.id === colId
        ? { ...c, type: newType, options: newType === 'select' || newType === 'multi-select' ? (c.options || []) : undefined }
        : c
    );
    // Reset cells for the column type change
    const rows = tableData.rows.map((r) => {
      const cells = { ...r.cells };
      cells[colId] = null;
      return { ...r, cells };
    });
    syncToParent({ ...tableData, columns, rows });
    setEditingColumnId(null);
  };

  const addOptionToColumn = (colId: string, option: SelectOption) => {
    const columns = tableData.columns.map((c) =>
      c.id === colId ? { ...c, options: [...(c.options || []), option] } : c
    );
    syncToParent({ ...tableData, columns });
  };

  // ─── Row Operations ───────

  const addRow = () => {
    const newRow: TableRow = { id: generateId(), cells: {} };
    syncToParent({ ...tableData, rows: [...tableData.rows, newRow] });
  };

  const deleteRow = (rowId: string) => {
    const rows = tableData.rows.filter((r) => r.id !== rowId);
    syncToParent({ ...tableData, rows });
  };

  const updateCell = (rowId: string, colId: string, value: CellValue) => {
    const rows = tableData.rows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
    );
    syncToParent({ ...tableData, rows });
  };

  // ─── Column Resize ────────

  const handleResizeStart = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colId);
    resizeStartX.current = e.clientX;
    const col = tableData.columns.find((c) => c.id === colId);
    resizeStartWidth.current = col?.width || 150;
  };

  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, resizeStartWidth.current + diff);
      updateColumn(resizingCol, { width: newWidth });
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  // ─── Sorting ───────

  const toggleSort = (colId: string) => {
    if (sort?.columnId === colId) {
      if (sort.direction === 'asc') setSort({ columnId: colId, direction: 'desc' });
      else setSort(null);
    } else {
      setSort({ columnId: colId, direction: 'asc' });
    }
  };

  // ─── Filtering ─────

  const addFilter = () => {
    if (tableData.columns.length === 0) return;
    setFilters([...filters, {
      columnId: tableData.columns[0].id,
      operator: 'contains',
      value: '',
    }]);
    setShowFilterPanel(true);
  };

  const updateFilter = (index: number, updates: Partial<TableFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // ─── Apply Sort & Filter to Rows ───────

  let displayRows = [...tableData.rows];

  // Apply filters
  for (const filter of filters) {
    if (!filter.value && filter.operator !== 'empty' && filter.operator !== 'not-empty') continue;
    const col = tableData.columns.find((c) => c.id === filter.columnId);
    if (!col) continue;

    displayRows = displayRows.filter((row) => {
      const cell = row.cells[filter.columnId];
      const cellStr = String(cell ?? '').toLowerCase();
      const filterVal = filter.value.toLowerCase();

      switch (filter.operator) {
        case 'contains': return cellStr.includes(filterVal);
        case 'equals': return cellStr === filterVal;
        case 'not-empty': return cell != null && cellStr !== '';
        case 'empty': return cell == null || cellStr === '';
        case 'gt': return Number(cell) > Number(filter.value);
        case 'lt': return Number(cell) < Number(filter.value);
        default: return true;
      }
    });
  }

  // Apply sort
  if (sort) {
    const col = tableData.columns.find((c) => c.id === sort.columnId);
    if (col) {
      displayRows.sort((a, b) => {
        const aVal = a.cells[sort.columnId] ?? '';
        const bVal = b.cells[sort.columnId] ?? '';
        const dir = sort.direction === 'asc' ? 1 : -1;

        if (col.type === 'number') {
          return (Number(aVal) - Number(bVal)) * dir;
        }
        return String(aVal).localeCompare(String(bVal)) * dir;
      });
    }
  }

  // ─── Render Cell ───────

  const renderCell = (row: TableRow, col: TableColumn) => {
    const value = row.cells[col.id];

    switch (col.type) {
      case 'text':
        return <TextCell value={value as string} onChange={(v) => updateCell(row.id, col.id, v)} />;
      case 'number':
        return <NumberCell value={value as number} onChange={(v) => updateCell(row.id, col.id, v)} />;
      case 'date':
        return <DateCell value={value as string} onChange={(v) => updateCell(row.id, col.id, v)} />;
      case 'checkbox':
        return <CheckboxCell value={value as boolean} onChange={(v) => updateCell(row.id, col.id, v)} />;
      case 'url':
        return <UrlCell value={value as string} onChange={(v) => updateCell(row.id, col.id, v)} />;
      case 'select':
        return (
          <SelectCell
            value={value}
            options={col.options || []}
            onChange={(v) => updateCell(row.id, col.id, v)}
            onAddOption={(opt) => addOptionToColumn(col.id, opt)}
          />
        );
      case 'multi-select':
        return (
          <SelectCell
            value={value}
            options={col.options || []}
            onChange={(v) => updateCell(row.id, col.id, v)}
            onAddOption={(opt) => addOptionToColumn(col.id, opt)}
            multi
          />
        );
      default:
        return <TextCell value={value as string} onChange={(v) => updateCell(row.id, col.id, v)} />;
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50
                      border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSort(tableData.columns[0]?.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded
                     hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          <ArrowUpDown size={14} />
          <span>Sort</span>
        </button>
        <button
          onClick={addFilter}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded
                      hover:bg-gray-200 dark:hover:bg-gray-700
                      ${filters.length > 0
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400'}`}
        >
          <Filter size={14} />
          <span>Filter{filters.length > 0 ? ` (${filters.length})` : ''}</span>
        </button>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && filters.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/30 border-b
                        border-gray-200 dark:border-gray-700 space-y-2">
          {filters.map((filter, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={filter.columnId}
                onChange={(e) => updateFilter(i, { columnId: e.target.value })}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1
                           bg-white dark:bg-gray-800 dark:text-gray-200"
              >
                {tableData.columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(i, { operator: e.target.value as TableFilter['operator'] })}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1
                           bg-white dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="not-empty">Is not empty</option>
                <option value="empty">Is empty</option>
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
              </select>
              {!['empty', 'not-empty'].includes(filter.operator) && (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="Value..."
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1
                             flex-1 bg-white dark:bg-gray-800 dark:text-gray-200 outline-none"
                />
              )}
              <button
                onClick={() => removeFilter(i)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X size={12} className="text-gray-400" />
              </button>
            </div>
          ))}
          <button
            onClick={() => { setFilters([]); setShowFilterPanel(false); }}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="w-8 min-w-[32px] border-b border-r border-gray-200 dark:border-gray-700" />
              {tableData.columns.map((col) => {
                const Icon = getColumnIcon(col.type);
                return (
                  <th
                    key={col.id}
                    className="relative border-b border-r border-gray-200 dark:border-gray-700
                               text-left select-none group"
                    style={{ width: col.width, minWidth: col.width }}
                  >
                    <div
                      className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer
                                 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={(e) => {
                        if (editingColumnId === col.id) {
                          setEditingColumnId(null);
                          setMenuTrigger(null);
                        } else {
                          setEditingColumnId(col.id);
                          setMenuTrigger(e.currentTarget as HTMLElement);
                        }
                      }}
                    >
                      <Icon size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">
                        {col.name}
                      </span>
                      {sort?.columnId === col.id && (
                        sort.direction === 'asc'
                          ? <ArrowUp size={12} className="text-blue-500 flex-shrink-0" />
                          : <ArrowDown size={12} className="text-blue-500 flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSort(col.id); }}
                        className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded
                                   hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </button>
                    </div>

                    {/* Resize handle */}
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize
                                 hover:bg-blue-500 transition-colors"
                      onMouseDown={(e) => handleResizeStart(col.id, e)}
                    />

                    {/* Column menu */}
                    {editingColumnId === col.id && menuTrigger && (
                      <TablePortal
                        triggerRef={{ current: menuTrigger }}
                        onClose={() => { setEditingColumnId(null); setMenuTrigger(null); }}
                      >
                        <ColumnHeaderMenu
                          column={col}
                          onRename={(name) => { updateColumn(col.id, { name }); setEditingColumnId(null); }}
                          onChangeType={(type) => changeColumnType(col.id, type)}
                          onDelete={() => deleteColumn(col.id)}
                          onClose={() => setEditingColumnId(null)}
                        />
                      </TablePortal>
                    )}
                  </th>
                );
              })}
              <th className="border-b border-gray-200 dark:border-gray-700 w-8 min-w-[32px]">
                <button
                  onClick={addColumn}
                  className="w-full h-full flex items-center justify-center py-1.5
                             hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Add a column"
                >
                  <Plus size={14} className="text-gray-400" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className="group/row hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <td className="border-b border-r border-gray-200 dark:border-gray-700
                               text-center relative">
                  <span className="text-[10px] text-gray-400 group-hover/row:hidden">
                    {rowIndex + 1}
                  </span>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="hidden group-hover/row:flex items-center justify-center
                               w-full h-full absolute inset-0"
                    title="Delete row"
                  >
                    <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                  </button>
                </td>
                {tableData.columns.map((col) => (
                  <td
                    key={col.id}
                    className="border-b border-r border-gray-200 dark:border-gray-700"
                    style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                  >
                    {renderCell(row, col)}
                  </td>
                ))}
                <td className="border-b border-gray-200 dark:border-gray-700" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500
                   hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
      >
        <Plus size={14} />
        <span>New row</span>
      </button>
    </div>
  );
}

