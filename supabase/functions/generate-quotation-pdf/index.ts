import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotationData {
  id: string;
  quotation_number: string;
  title: string;
  description: string | null;
  status: string;
  valid_until: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    vat_number: string | null;
  } | null;
  quotation_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    subtotal: number;
    vat_amount: number;
    total: number;
  }>;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  fiscal_name: string | null;
  rfc: string | null;
  avatar_url: string | null;
}

function generatePDFHTML(quotation: QuotationData, profile: ProfileData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const clientName = quotation.clients
    ? `${quotation.clients.first_name} ${quotation.clients.last_name || ''}`.trim()
    : 'Cliente no especificado';

  const businessName = profile.business_name || profile.fiscal_name || 
    `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: letter;
      margin: 0.5in;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #2c3e50;
      line-height: 1.6;
      padding: 30px;
      background: #ffffff;
      width: 8.5in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3498db;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid #3498db;
    }
    
    .company-info h1 {
      font-size: 24px;
      color: #2c3e50;
      margin-bottom: 8px;
      font-weight: 700;
    }
    
    .company-info p {
      font-size: 12px;
      color: #7f8c8d;
      margin: 2px 0;
    }
    
    .quotation-header {
      text-align: right;
    }
    
    .quotation-number {
      font-size: 28px;
      color: #3498db;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .quotation-meta {
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .quotation-meta p {
      margin: 4px 0;
    }
    
    .quotation-title {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    
    .quotation-title h2 {
      font-size: 22px;
      margin-bottom: 8px;
    }
    
    .quotation-title p {
      font-size: 14px;
      opacity: 0.95;
    }
    
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .party-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #3498db;
    }
    
    .party-section h3 {
      font-size: 14px;
      color: #3498db;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .party-section p {
      font-size: 13px;
      margin: 6px 0;
      color: #2c3e50;
    }
    
    .party-section .name {
      font-weight: 700;
      font-size: 16px;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .items-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .items-table th {
      padding: 15px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .items-table th.text-right {
      text-align: right;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #ecf0f1;
      transition: background 0.2s;
    }
    
    .items-table tbody tr:hover {
      background: #f8f9fa;
    }
    
    .items-table td {
      padding: 15px;
      font-size: 13px;
    }
    
    .items-table td.text-right {
      text-align: right;
      font-weight: 500;
    }
    
    .items-table td.description {
      color: #2c3e50;
      font-weight: 500;
    }
    
    .totals-section {
      margin-left: auto;
      width: 350px;
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #ecf0f1;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    
    .total-row:last-child {
      border-bottom: none;
      border-top: 2px solid #3498db;
      padding-top: 15px;
      margin-top: 10px;
    }
    
    .total-row.final {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }
    
    .total-row span:first-child {
      color: #7f8c8d;
      font-size: 13px;
      font-weight: 500;
    }
    
    .total-row span:last-child {
      font-weight: 600;
      color: #2c3e50;
    }
    
    .total-row.final span {
      color: #2c3e50;
      font-size: 20px;
    }
    
    .notes-section {
      margin-top: 40px;
      padding: 20px;
      background: #fff9e6;
      border-left: 4px solid #f39c12;
      border-radius: 8px;
    }
    
    .notes-section h3 {
      font-size: 14px;
      color: #f39c12;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .notes-section p {
      font-size: 13px;
      color: #2c3e50;
      line-height: 1.8;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #ecf0f1;
      text-align: center;
      color: #95a5a6;
      font-size: 11px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-draft { background: #ecf0f1; color: #7f8c8d; }
    .status-sent { background: #e3f2fd; color: #2196f3; }
    .status-accepted { background: #e8f5e9; color: #4caf50; }
    .status-rejected { background: #ffebee; color: #f44336; }
    .status-completed { background: #f3e5f5; color: #9c27b0; }
    
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-section">
      ${profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="Logo" class="logo">`
        : `<div class="logo" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 700;">${businessName.substring(0, 2).toUpperCase()}</div>`
      }
      <div class="company-info">
        <h1>${businessName}</h1>
        ${profile.rfc ? `<p><strong>RFC:</strong> ${profile.rfc}</p>` : ''}
        ${profile.fiscal_name && profile.fiscal_name !== businessName ? `<p>${profile.fiscal_name}</p>` : ''}
      </div>
    </div>
    
    <div class="quotation-header">
      <div class="quotation-number">${quotation.quotation_number}</div>
      <div class="quotation-meta">
        <p><strong>Fecha:</strong> ${formatDate(quotation.created_at)}</p>
        ${quotation.valid_until ? `<p><strong>Válida hasta:</strong> ${formatDate(quotation.valid_until)}</p>` : ''}
        <p><span class="status-badge status-${quotation.status}">${
          {
            draft: 'Borrador',
            sent: 'Enviada',
            accepted: 'Aceptada',
            rejected: 'Rechazada',
            completed: 'Completada',
            expired: 'Expirada'
          }[quotation.status] || quotation.status
        }</span></p>
      </div>
    </div>
  </div>
  
  <!-- Quotation Title -->
  <div class="quotation-title">
    <h2>${quotation.title}</h2>
    ${quotation.description ? `<p>${quotation.description}</p>` : ''}
  </div>
  
  <!-- Parties -->
  <div class="parties">
    <div class="party-section">
      <h3>Para</h3>
      <p class="name">${clientName}</p>
      ${quotation.clients?.email ? `<p><strong>Email:</strong> ${quotation.clients.email}</p>` : ''}
      ${quotation.clients?.phone ? `<p><strong>Teléfono:</strong> ${quotation.clients.phone}</p>` : ''}
      ${quotation.clients?.address ? `<p><strong>Dirección:</strong> ${quotation.clients.address}</p>` : ''}
      ${quotation.clients?.vat_number ? `<p><strong>RFC:</strong> ${quotation.clients.vat_number}</p>` : ''}
    </div>
    
    <div class="party-section">
      <h3>De</h3>
      <p class="name">${businessName}</p>
      ${profile.rfc ? `<p><strong>RFC:</strong> ${profile.rfc}</p>` : ''}
    </div>
  </div>
  
  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 10%">Cant.</th>
        <th style="width: 50%">Descripción</th>
        <th class="text-right" style="width: 15%">Precio Unit.</th>
        <th class="text-right" style="width: 10%">IVA</th>
        <th class="text-right" style="width: 15%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${quotation.quotation_items.map(item => `
        <tr>
          <td>${item.quantity}</td>
          <td class="description">${item.description}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${item.vat_rate}%</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <!-- Totals -->
  <div class="totals-section">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${formatCurrency(quotation.subtotal)}</span>
    </div>
    <div class="total-row">
      <span>IVA</span>
      <span>${formatCurrency(quotation.vat_amount)}</span>
    </div>
    <div class="total-row final">
      <span>Total</span>
      <span>${formatCurrency(quotation.total_amount)}</span>
    </div>
  </div>
  
  <!-- Notes -->
  ${quotation.notes ? `
    <div class="notes-section">
      <h3>Notas</h3>
      <p>${quotation.notes}</p>
    </div>
  ` : ''}
  
  <!-- Footer -->
  <div class="footer">
    <p>Este documento es una cotización y no constituye una factura fiscal.</p>
    <p>Gracias por su preferencia</p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user with the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    const { quotationId } = await req.json();

    if (!quotationId) {
      throw new Error('quotationId is required');
    }

    // Fetch quotation with items and client
    const { data: quotation, error: quotationError } = await supabaseAdmin
      .from('quotations')
      .select(`
        *,
        clients(*),
        quotation_items(*)
      `)
      .eq('id', quotationId)
      .eq('user_id', user.id)
      .single();

    if (quotationError || !quotation) {
      throw new Error('Quotation not found');
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, business_name, fiscal_name, rfc, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Profile not found');
    }

    // Generate HTML
    const html = generatePDFHTML(quotation as unknown as QuotationData, profile as ProfileData);

    // Return HTML (will be converted to PDF on client side using print)
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
