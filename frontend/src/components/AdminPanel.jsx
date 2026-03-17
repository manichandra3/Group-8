import React, { useState } from 'react';
import { useData } from '../context/DataContext';

// Reusable form modal (simplified – you can enhance later)
function EditForm({ title, fields, initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData || {});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 8, marginBottom: 20 }}>
      <h3>{title}</h3>
      <form onSubmit={handleSubmit}>
        {fields.map(field => (
          <div key={field.name} style={{ marginBottom: 10 }}>
            <label>{field.label}: </label>
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              style={{ background: '#1e1e3f', border: '1px solid #2d2d5f', color: '#fff', padding: 5, borderRadius: 4 }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4 }}>Save</button>
          <button type="button" onClick={onCancel} style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPanel() {
  const {
    stocks, addStock, updateStock, deleteStock,
    mfHoldings, addMF, updateMF, deleteMF,
    sips, addSIP, updateSIP, deleteSIP,
    ipos, addIPO, updateIPO, deleteIPO,
    orders, addOrder, updateOrder, deleteOrder,
  } = useData();

  const [editing, setEditing] = useState(null); // { type, id, data }

  // Common render for a list with edit/delete
  const renderList = (title, items, type, fields, onAdd) => (
    <div style={{ marginBottom: 30 }}>
      <h4>{title}</h4>
      <button onClick={() => setEditing({ type, action: 'add', data: {} })} style={{ marginBottom: 10 }}>Add New</button>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {fields.map(f => <th key={f.name} style={{ textAlign: 'left', borderBottom: '1px solid #2d2d5f', padding: 8 }}>{f.label}</th>)}
            <th style={{ borderBottom: '1px solid #2d2d5f', padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              {fields.map(f => (
                <td key={f.name} style={{ padding: 8, borderBottom: '1px solid #2d2d5f' }}>{item[f.name]}</td>
              ))}
              <td style={{ padding: 8, borderBottom: '1px solid #2d2d5f' }}>
                <button onClick={() => setEditing({ type, action: 'edit', id: item.id, data: item })}>Edit</button>
                <button onClick={() => {
                  if (type === 'stock') deleteStock(item.id);
                  if (type === 'mf') deleteMF(item.id);
                  if (type === 'sip') deleteSIP(item.id);
                  if (type === 'ipo') deleteIPO(item.id);
                  if (type === 'order') deleteOrder(item.id);
                }} style={{ marginLeft: 8 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Handle save from edit form
  const handleSave = (formData) => {
    if (editing.action === 'add') {
      switch (editing.type) {
        case 'stock': addStock(formData); break;
        case 'mf': addMF(formData); break;
        case 'sip': addSIP(formData); break;
        case 'ipo': addIPO(formData); break;
        case 'order': addOrder(formData); break;
        default: break;
      }
    } else if (editing.action === 'edit') {
      switch (editing.type) {
        case 'stock': updateStock(editing.id, formData); break;
        case 'mf': updateMF(editing.id, formData); break;
        case 'sip': updateSIP(editing.id, formData); break;
        case 'ipo': updateIPO(editing.id, formData); break;
        case 'order': updateOrder(editing.id, formData); break;
        default: break;
      }
    }
    setEditing(null);
  };

  // Field definitions for each entity
  const stockFields = [
    { name: 'label', label: 'Symbol' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'changePct', label: 'Change %', type: 'number' },
    { name: 'up', label: 'Up? (true/false)' },
  ];
  const mfFields = [
    { name: 'name', label: 'Fund Name' },
    { name: 'type', label: 'Category' },
    { name: 'invested', label: 'Invested', type: 'number' },
    { name: 'current', label: 'Current', type: 'number' },
    { name: 'returns', label: 'Returns %', type: 'number' },
    { name: 'rating', label: 'Rating (1-5)', type: 'number' },
  ];
  const sipFields = [
    { name: 'name', label: 'Fund Name' },
    { name: 'amt', label: 'Amount', type: 'number' },
    { name: 'date', label: 'Date (e.g. 5th)' },
    { name: 'status', label: 'Status' },
    { name: 'nextDate', label: 'Next Date' },
  ];
  const ipoFields = [
    { name: 'name', label: 'IPO Name' },
    { name: 'price', label: 'Price Band' },
    { name: 'open', label: 'Open Date' },
    { name: 'close', label: 'Close Date' },
    { name: 'status', label: 'Status' },
    { name: 'gmp', label: 'GMP' },
  ];
  const orderFields = [
    { name: 'sym', label: 'Symbol' },
    { name: 'type', label: 'Type (BUY/SELL)' },
    { name: 'qty', label: 'Quantity', type: 'number' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'status', label: 'Status' },
    { name: 'time', label: 'Time' },
  ];

  return (
    <div className="d-section fade-in">
      <div className="d-page-title">⚙️ Admin Panel</div>
      <p>Manage all investment data below. Changes are immediately visible to all users (while using static data).</p>

      {editing && (
        <EditForm
          title={`${editing.action === 'add' ? 'Add' : 'Edit'} ${editing.type}`}
          fields={
            editing.type === 'stock' ? stockFields :
            editing.type === 'mf' ? mfFields :
            editing.type === 'sip' ? sipFields :
            editing.type === 'ipo' ? ipoFields : orderFields
          }
          initialData={editing.data}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {renderList('Stocks', stocks, 'stock', stockFields)}
      {renderList('Mutual Funds', mfHoldings, 'mf', mfFields)}
      {renderList('SIPs', sips, 'sip', sipFields)}
      {renderList('IPOs', ipos, 'ipo', ipoFields)}
      {renderList('Orders', orders, 'order', orderFields)}
    </div>
  );
}