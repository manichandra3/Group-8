import React, { useState } from 'react';
import { useData } from '../context/DataContext';

// Reusable form modal
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
            {field.type === 'select' ? (
               <select
                 name={field.name}
                 value={formData[field.name] || ''}
                 onChange={handleChange}
                 style={{ background: '#1e1e3f', border: '1px solid #2d2d5f', color: '#fff', padding: 5, borderRadius: 4, width: '100%' }}
               >
                 <option value="">Select...</option>
                 {field.options && field.options.map(opt => (
                   <option key={opt.value} value={opt.value}>{opt.label}</option>
                 ))}
               </select>
            ) : (
                <input
                  type={field.type || 'text'}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  readOnly={field.readOnly}
                  style={{ background: field.readOnly ? '#333' : '#1e1e3f', border: '1px solid #2d2d5f', color: '#fff', padding: 5, borderRadius: 4 }}
                />
            )}
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
    companies, addCompany, updateCompany, deleteCompany,
    orders, addOrder, updateOrder, deleteOrder,
  } = useData();

  const [editing, setEditing] = useState(null); // { type, action, id, data }

  // Common render for a list with edit/delete
  const renderList = (title, items, type, fields) => (
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
                  if (type === 'company') deleteCompany(item.id);
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
        case 'company': addCompany(formData); break;
        case 'stock': addStock(formData); break;
        case 'order': addOrder(formData); break;
        default: break;
      }
    } else if (editing.action === 'edit') {
      switch (editing.type) {
        case 'company': updateCompany(editing.id, formData); break;
        case 'stock': updateStock(editing.id, formData); break;
        case 'order': updateOrder(editing.id, formData); break;
        default: break;
      }
    }
    setEditing(null);
  };

  // Field definitions for each entity
  const companyFields = [
    { name: 'name', label: 'Company Name' },
    { name: 'symbol', label: 'Symbol (Ticker)' },
    { name: 'sector', label: 'Sector' },
  ];

  // Prepare company options for Stock dropdown
  const companyOptions = companies ? companies.map(c => ({ value: c.id, label: `${c.name} (${c.symbol})` })) : [];

  const stockFields = [
    // If adding, allow selecting company. If editing, maybe read-only label?
    // Simplified: For adding, require Company ID. For display, show Label.
    { name: 'label', label: 'Symbol', readOnly: true }, // Display only
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'totalShares', label: 'Total Shares', type: 'number' },
    // Only show Company dropdown when Adding
    ...(editing?.action === 'add' ? [{ name: 'companyId', label: 'Company', type: 'select', options: companyOptions }] : []),
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
      <p>Manage companies and shares directly from the database.</p>

      {editing && (
        <EditForm
          title={`${editing.action === 'add' ? 'Add' : 'Edit'} ${editing.type}`}
          fields={
            editing.type === 'company' ? companyFields :
            editing.type === 'stock' ? stockFields :
            orderFields
          }
          initialData={editing.data}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {renderList('Companies', companies, 'company', companyFields)}
      {renderList('Shares (Stocks)', stocks, 'stock', stockFields)}
      {renderList('Orders', orders, 'order', orderFields)}
    </div>
  );
}
