import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  TableData, TableColumn, TableRow, TableSort, TableFilter,
  ColumnType, SelectOption, CellValue, Block
} from '@/lib/types';
import {
  Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter, X,
  GripVertical, Eye, Copy, ChevronDown, Calculator, MoreHorizontal
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

// ─── Types ─────────────────────────────────────────────────────

interface DragState {
  type: 'column' | 'row' | null;
  id: string | null;
  startIndex: number;
  currentIndex: number;
}

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

type CalculationType = 'none' | 'count' | 'count-values' | 'count-unique' | 'count-empty' |
  'count-not-empty' | 'percent-empty' | 'percent-not-empty' |
  'sum' | 'average' | 'median' | 'min' | 'max' | 'range';

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
  const [dragState, setDragState] = useState<DragState>({ type: null, id: null, startIndex: -1, currentIndex: -1 });
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [showHiddenColumnsMenu, setShowHiddenColumnsMenu] = useState(false);
  const [columnCalculations, setColumnCalculations] = useState<Record<string, CalculationType>>({});
  const [showCalcMenu, setShowCalcMenu] = useState<string | null>(null);
  const [rowActionMenu, setRowActionMenu] = useState<string | null>(null);

  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  // Sync to parent
  const syncToParent = useCallback(
    (data: TableData) => {
      setTableData(data);
      onUpdate({ ...block, tableData: data });
    },
    [block, onUpdate]
  );

  // ─── Visible columns helper ───────
  const visibleColumns = useMemo(() =>
    tableData.columns.filter(c => !c.hidden),
    [tableData.columns]
  );

  const hiddenColumns = useMemo(() =>
    tableData.columns.filter(c => c.hidden),
    [tableData.columns]
  );

  // ─── Column Operations ───────

  const addColumn = (atIndex?: number) => {
    const newCol: TableColumn = {
      id: generateId(),
      name: `Column ${tableData.columns.length + 1}`,
      type: 'text',
      width: 150,
    };
    const columns = [...tableData.columns];
    if (atIndex !== undefined) {
      columns.splice(atIndex, 0, newCol);
    } else {
      columns.push(newCol);
    }
    syncToParent({ ...tableData, columns });
  };

  const updateColumn = (colId: string, updates: Partial<TableColumn>) => {
    const columns = tableData.columns.map((c) =>
      c.id === colId ? { ...c, ...updates } : c
    );
    syncToParent({ ...tableData, columns });
  };

  const deleteColumn = (colId: string) => {
    if (tableData.columns.filter(c => !c.hidden).length <= 1) return;
    const columns = tableData.columns.filter((c) => c.id !== colId);
    const rows = tableData.rows.map((r) => {
      const cells = { ...r.cells };
      delete cells[colId];
      return { ...r, cells };
    });
    syncToParent({ ...tableData, columns, rows });
    setEditingColumnId(null);
  };

  const duplicateColumn = (colId: string) => {
    const colIndex = tableData.columns.findIndex(c => c.id === colId);
    const sourceCol = tableData.columns[colIndex];
    if (colIndex === -1 || !sourceCol) return;

    const newCol: TableColumn = {
      ...sourceCol,
      id: generateId(),
      name: `${sourceCol.name} (copy)`,
    };

    const columns = [...tableData.columns];
    columns.splice(colIndex + 1, 0, newCol);

    // Copy cell values
    const rows = tableData.rows.map((r) => ({
      ...r,
      cells: { ...r.cells, [newCol.id]: r.cells[colId] ?? null }
    }));

    syncToParent({ ...tableData, columns, rows });
    setEditingColumnId(null);
  };

  const hideColumn = (colId: string) => {
    updateColumn(colId, { hidden: true });
    setEditingColumnId(null);
  };

  const showColumn = (colId: string) => {
    updateColumn(colId, { hidden: false });
  };

  const insertColumnAt = (colId: string, position: 'left' | 'right') => {
    const colIndex = tableData.columns.findIndex(c => c.id === colId);
    if (colIndex === -1) return;
    addColumn(position === 'left' ? colIndex : colIndex + 1);
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

  const addRow = (atIndex?: number) => {
    const newRow: TableRow = { id: generateId(), cells: {} };
    const rows = [...tableData.rows];
    if (atIndex !== undefined) {
      rows.splice(atIndex, 0, newRow);
    } else {
      rows.push(newRow);
    }
    syncToParent({ ...tableData, rows });
  };

  const deleteRow = (rowId: string) => {
    const rows = tableData.rows.filter((r) => r.id !== rowId);
    syncToParent({ ...tableData, rows });
  };

  const duplicateRow = (rowId: string) => {
    const rowIndex = tableData.rows.findIndex(r => r.id === rowId);
    const sourceRow = tableData.rows[rowIndex];
    if (rowIndex === -1 || !sourceRow) return;

    const newRow: TableRow = {
      id: generateId(),
      cells: { ...sourceRow.cells }
    };

    const rows = [...tableData.rows];
    rows.splice(rowIndex + 1, 0, newRow);
    syncToParent({ ...tableData, rows });
    setRowActionMenu(null);
  };

  const insertRowAt = (rowId: string, position: 'above' | 'below') => {
    const rowIndex = tableData.rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;
    addRow(position === 'above' ? rowIndex : rowIndex + 1);
    setRowActionMenu(null);
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
      const newWidth = Math.max(60, resizeStartWidth.current + diff);
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

  // ─── Column Drag & Drop ────────

  const handleColumnDragStart = (colId: string, index: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
    setDragState({ type: 'column', id: colId, startIndex: index, currentIndex: index });

    // Create drag preview
    const col = visibleColumns[index];
    if (!col) return;
    const preview = document.createElement('div');
    preview.className = 'bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded shadow-lg text-sm font-medium';
    preview.textContent = col.name;
    preview.style.position = 'absolute';
    preview.style.top = '-1000px';
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;
    e.dataTransfer.setDragImage(preview, 0, 0);
  };

  const handleColumnDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.type === 'column' && dragState.currentIndex !== index) {
      setDragState(prev => ({ ...prev, currentIndex: index }));
    }
  };

  const handleColumnDragEnd = () => {
    if (dragState.type === 'column' && dragState.id && dragState.startIndex !== dragState.currentIndex && dragState.startIndex >= 0) {
      const columns = [...tableData.columns];
      const removed = columns[dragState.startIndex];
      if (removed) {
        columns.splice(dragState.startIndex, 1);
        columns.splice(dragState.currentIndex, 0, removed);
        syncToParent({ ...tableData, columns });
      }
    }

    // Cleanup
    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }
    setDragState({ type: null, id: null, startIndex: -1, currentIndex: -1 });
  };

  // ─── Row Drag & Drop ────────

  const handleRowDragStart = (rowId: string, index: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
    setDragState({ type: 'row', id: rowId, startIndex: index, currentIndex: index });
  };

  const handleRowDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.type === 'row' && dragState.currentIndex !== index) {
      setDragState(prev => ({ ...prev, currentIndex: index }));
    }
  };

  const handleRowDragEnd = () => {
    if (dragState.type === 'row' && dragState.id && dragState.startIndex !== dragState.currentIndex && dragState.startIndex >= 0) {
      const rows = [...tableData.rows];
      const removed = rows[dragState.startIndex];
      if (removed) {
        rows.splice(dragState.startIndex, 1);
        rows.splice(dragState.currentIndex, 0, removed);
        syncToParent({ ...tableData, rows });
      }
    }
    setDragState({ type: null, id: null, startIndex: -1, currentIndex: -1 });
  };

  // ─── Keyboard Navigation ────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell) return;

    const { rowIndex, colIndex } = selectedCell;
    let newRow = rowIndex;
    let newCol = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, rowIndex - 1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        newRow = Math.min(displayRows.length - 1, rowIndex + 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, colIndex - 1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        newCol = Math.min(visibleColumns.length - 1, colIndex + 1);
        e.preventDefault();
        break;
      case 'Tab':
        if (e.shiftKey) {
          if (colIndex > 0) {
            newCol = colIndex - 1;
          } else if (rowIndex > 0) {
            newRow = rowIndex - 1;
            newCol = visibleColumns.length - 1;
          }
        } else {
          if (colIndex < visibleColumns.length - 1) {
            newCol = colIndex + 1;
          } else if (rowIndex < displayRows.length - 1) {
            newRow = rowIndex + 1;
            newCol = 0;
          }
        }
        e.preventDefault();
        break;
      case 'Escape':
        setSelectedCell(null);
        break;
      default:
        break;
    }

    if (newRow !== rowIndex || newCol !== colIndex) {
      setSelectedCell({ rowIndex: newRow, colIndex: newCol });
    }
  }, [selectedCell, visibleColumns.length]);

  useEffect(() => {
    if (selectedCell) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [selectedCell, handleKeyDown]);

  // ─── Sorting ───────

  const setColumnSort = (colId: string, direction: 'asc' | 'desc' | null) => {
    if (direction === null) {
      setSort(null);
    } else {
      setSort({ columnId: colId, direction });
    }
  };

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
    const firstCol = tableData.columns[0];
    if (!firstCol) return;
    setFilters([...filters, {
      columnId: firstCol.id,
      operator: 'contains',
      value: '',
    }]);
    setShowFilterPanel(true);
  };

  const updateFilter = (index: number, updates: Partial<TableFilter>) => {
    const newFilters = [...filters];
    const existing = newFilters[index];
    if (existing) {
      newFilters[index] = { ...existing, ...updates };
      setFilters(newFilters);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // ─── Column Calculations ────────

  const calculateColumnValue = (colId: string, calcType: CalculationType): string => {
    const col = tableData.columns.find(c => c.id === colId);
    if (!col || calcType === 'none') return '';

    const values = tableData.rows.map(r => r.cells[colId] ?? null).filter(v => v !== null && v !== undefined && v !== '');
    const allValues = tableData.rows.map(r => r.cells[colId] ?? null);
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));

    switch (calcType) {
      case 'count':
        return `Count: ${tableData.rows.length}`;
      case 'count-values':
        return `Values: ${values.length}`;
      case 'count-unique':
        return `Unique: ${new Set(values.map(String)).size}`;
      case 'count-empty':
        return `Empty: ${allValues.filter(v => v === null || v === undefined || v === '').length}`;
      case 'count-not-empty':
        return `Filled: ${values.length}`;
      case 'percent-empty':
        return `Empty: ${Math.round((allValues.filter(v => v === null || v === undefined || v === '').length / tableData.rows.length) * 100)}%`;
      case 'percent-not-empty':
        return `Filled: ${Math.round((values.length / tableData.rows.length) * 100)}%`;
      case 'sum':
        return col.type === 'number' ? `Sum: ${numericValues.reduce((a, b) => a + b, 0)}` : '-';
      case 'average':
        return col.type === 'number' ? `Avg: ${(numericValues.reduce((a, b) => a + b, 0) / numericValues.length || 0).toFixed(2)}` : '-';
      case 'median': {
        if (col.type !== 'number' || numericValues.length === 0) return '-';
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const midVal = sorted[mid] ?? 0;
        const midPrevVal = sorted[mid - 1] ?? 0;
        const median = sorted.length % 2 ? midVal : (midPrevVal + midVal) / 2;
        return `Median: ${median}`;
      }
      case 'min':
        return col.type === 'number' && numericValues.length ? `Min: ${Math.min(...numericValues)}` : '-';
      case 'max':
        return col.type === 'number' && numericValues.length ? `Max: ${Math.max(...numericValues)}` : '-';
      case 'range':
        return col.type === 'number' && numericValues.length ? `Range: ${Math.max(...numericValues) - Math.min(...numericValues)}` : '-';
      default:
        return '';
    }
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
    const value = row.cells[col.id] ?? null;

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

  const calculationOptions: { value: CalculationType; label: string; numericOnly?: boolean }[] = [
    { value: 'none', label: 'None' },
    { value: 'count', label: 'Count all' },
    { value: 'count-values', label: 'Count values' },
    { value: 'count-unique', label: 'Count unique' },
    { value: 'count-empty', label: 'Count empty' },
    { value: 'count-not-empty', label: 'Count not empty' },
    { value: 'percent-empty', label: 'Percent empty' },
    { value: 'percent-not-empty', label: 'Percent not empty' },
    { value: 'sum', label: 'Sum', numericOnly: true },
    { value: 'average', label: 'Average', numericOnly: true },
    { value: 'median', label: 'Median', numericOnly: true },
    { value: 'min', label: 'Min', numericOnly: true },
    { value: 'max', label: 'Max', numericOnly: true },
    { value: 'range', label: 'Range', numericOnly: true },
  ];

  return (
    <div
      ref={tableRef}
      className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50
                      border-b border-gray-200 dark:border-gray-700 flex-wrap">
        <button
          onClick={() => {
            const firstCol = tableData.columns[0];
            if (firstCol) toggleSort(firstCol.id);
          }}
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

        {/* Hidden columns indicator */}
        {hiddenColumns.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowHiddenColumnsMenu(!showHiddenColumnsMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded
                         hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <Eye size={14} />
              <span>{hiddenColumns.length} hidden</span>
              <ChevronDown size={12} />
            </button>

            {showHiddenColumnsMenu && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 menu-animate">
                <div className="p-1">
                  <div className="text-xs text-gray-500 px-2 py-1">Hidden columns</div>
                  {hiddenColumns.map(col => (
                    <button
                      key={col.id}
                      onClick={() => { showColumn(col.id); setShowHiddenColumnsMenu(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <Eye size={14} className="text-gray-400" />
                      <span className="dark:text-gray-300">{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        <span className="text-xs text-gray-400">
          {tableData.rows.length} rows · {visibleColumns.length} columns
        </span>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && filters.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/30 border-b
                        border-gray-200 dark:border-gray-700 space-y-2">
          {filters.map((filter, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
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
                             flex-1 min-w-[100px] bg-white dark:bg-gray-800 dark:text-gray-200 outline-none"
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
      <div className="overflow-x-auto table-scroll">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {/* Row handle column */}
              <th className="w-8 min-w-[32px] border-b border-r border-gray-200 dark:border-gray-700" />

              {visibleColumns.map((col, colIndex) => {
                const Icon = getColumnIcon(col.type);
                const isDragTarget = dragState.type === 'column' && dragState.currentIndex === colIndex && dragState.id !== col.id;

                return (
                  <th
                    key={col.id}
                    draggable
                    onDragStart={(e) => handleColumnDragStart(col.id, colIndex, e)}
                    onDragOver={(e) => handleColumnDragOver(colIndex, e)}
                    onDragEnd={handleColumnDragEnd}
                    className={`relative border-b border-r border-gray-200 dark:border-gray-700
                               text-left select-none group transition-all
                               ${isDragTarget ? 'bg-blue-100 dark:bg-blue-900/40 drag-indicator-left' : ''}
                               ${dragState.id === col.id ? 'opacity-50' : ''}`}
                    style={{ width: col.width, minWidth: col.width }}
                  >
                    <div
                      className="flex items-center gap-1 px-2 py-1.5 cursor-pointer
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
                      <GripVertical
                        size={12}
                        className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0"
                      />
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
                      className={`absolute top-0 right-0 w-1 h-full cursor-col-resize
                                 transition-colors ${resizingCol === col.id ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
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
                          onDuplicate={() => duplicateColumn(col.id)}
                          onHide={() => hideColumn(col.id)}
                          onInsertLeft={() => insertColumnAt(col.id, 'left')}
                          onInsertRight={() => insertColumnAt(col.id, 'right')}
                          onSort={(dir) => setColumnSort(col.id, dir)}
                          onToggleWrap={() => updateColumn(col.id, { wrap: !col.wrap })}
                          currentSort={sort?.columnId === col.id ? sort.direction : null}
                          canDelete={visibleColumns.length > 1}
                          onClose={() => setEditingColumnId(null)}
                        />
                      </TablePortal>
                    )}
                  </th>
                );
              })}

              {/* Add column button */}
              <th className="border-b border-gray-200 dark:border-gray-700 w-8 min-w-[32px]">
                <button
                  onClick={() => addColumn()}
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
            {displayRows.map((row, rowIndex) => {
              const isDragTarget = dragState.type === 'row' && dragState.currentIndex === rowIndex && dragState.id !== row.id;

              return (
                <tr
                  key={row.id}
                  draggable
                  onDragStart={(e) => handleRowDragStart(row.id, rowIndex, e)}
                  onDragOver={(e) => handleRowDragOver(rowIndex, e)}
                  onDragEnd={handleRowDragEnd}
                  className={`group/row hover:bg-gray-50 dark:hover:bg-gray-800/30 table-row-hover
                             ${isDragTarget ? 'bg-blue-50 dark:bg-blue-900/20 drag-indicator-top relative' : ''}
                             ${dragState.id === row.id ? 'opacity-50' : ''}`}
                >
                  {/* Row handle */}
                  <td className="border-b border-r border-gray-200 dark:border-gray-700 relative">
                    <div className="flex items-center justify-center h-full py-1">
                      <GripVertical
                        size={12}
                        className="text-gray-300 dark:text-gray-600 opacity-0 group-hover/row:opacity-100 cursor-grab"
                      />
                      <span className="text-[10px] text-gray-400 absolute group-hover/row:hidden">
                        {rowIndex + 1}
                      </span>
                    </div>

                    {/* Row action menu trigger */}
                    <button
                      onClick={() => setRowActionMenu(rowActionMenu === row.id ? null : row.id)}
                      className="hidden group-hover/row:flex items-center justify-center
                                 w-full h-full absolute inset-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MoreHorizontal size={12} className="text-gray-400" />
                    </button>

                    {/* Row action menu */}
                    {rowActionMenu === row.id && (
                      <div className="absolute left-full top-0 ml-1 z-50 min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 menu-animate">
                        <div className="p-1">
                          <button
                            onClick={() => insertRowAt(row.id, 'above')}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                          >
                            <ArrowUp size={14} className="text-gray-400" />
                            <span className="dark:text-gray-300">Insert above</span>
                          </button>
                          <button
                            onClick={() => insertRowAt(row.id, 'below')}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                          >
                            <ArrowDown size={14} className="text-gray-400" />
                            <span className="dark:text-gray-300">Insert below</span>
                          </button>
                          <button
                            onClick={() => duplicateRow(row.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                          >
                            <Copy size={14} className="text-gray-400" />
                            <span className="dark:text-gray-300">Duplicate</span>
                          </button>
                          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                          <button
                            onClick={() => { deleteRow(row.id); setRowActionMenu(null); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-left"
                          >
                            <Trash2 size={14} />
                            <span>Delete row</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Cells */}
                  {visibleColumns.map((col, colIndex) => {
                    const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;

                    return (
                      <td
                        key={col.id}
                        onClick={() => setSelectedCell({ rowIndex, colIndex })}
                        className={`border-b border-r border-gray-200 dark:border-gray-700
                                   table-cell-transition table-cell
                                   ${isSelected ? 'ring-2 ring-blue-500 ring-inset cell-selected' : ''}
                                   ${col.wrap ? '' : 'overflow-hidden'}`}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                      >
                        {renderCell(row, col)}
                      </td>
                    );
                  })}
                  <td className="border-b border-gray-200 dark:border-gray-700" />
                </tr>
              );
            })}
          </tbody>

          {/* Calculations footer */}
          {Object.values(columnCalculations).some(v => v !== 'none') && (
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/30">
                <td className="border-t border-gray-200 dark:border-gray-700" />
                {visibleColumns.map((col) => (
                  <td
                    key={col.id}
                    className="border-t border-r border-gray-200 dark:border-gray-700 px-2 py-1"
                    style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                  >
                    <span className="text-xs text-gray-500 font-medium">
                      {calculateColumnValue(col.id, columnCalculations[col.id] || 'none')}
                    </span>
                  </td>
                ))}
                <td className="border-t border-gray-200 dark:border-gray-700" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex items-center border-t border-gray-100 dark:border-gray-800">
        {/* Add row */}
        <button
          onClick={() => addRow()}
          className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-500
                     hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        >
          <Plus size={14} />
          <span>New row</span>
        </button>

        {/* Calculations toggle */}
        <div className="relative">
          <button
            onClick={() => setShowCalcMenu(showCalcMenu ? null : 'menu')}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500
                       hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border-l border-gray-100 dark:border-gray-800"
          >
            <Calculator size={14} />
            <span>Calculate</span>
          </button>

          {showCalcMenu && (
            <div className="absolute bottom-full right-0 mb-1 z-50 min-w-[280px] max-h-[300px] overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 menu-animate">
              <div className="p-2">
                <div className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wide">Column calculations</div>
                {visibleColumns.map(col => (
                  <div key={col.id} className="flex items-center gap-2 px-2 py-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">{col.name}</span>
                    <select
                      value={columnCalculations[col.id] || 'none'}
                      onChange={(e) => setColumnCalculations(prev => ({
                        ...prev,
                        [col.id]: e.target.value as CalculationType
                      }))}
                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1
                                 bg-white dark:bg-gray-800 dark:text-gray-200"
                    >
                      {calculationOptions
                        .filter(opt => !opt.numericOnly || col.type === 'number')
                        .map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))
                      }
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
