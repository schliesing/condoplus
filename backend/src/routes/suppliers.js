const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { getCondoPool } = require('../services/database');
const suppliersService = require('../services/suppliers');
const auditService = require('../services/audit');

const router = express.Router();

/**
 * GET /api/suppliers
 * List all suppliers for the condominium
 * Accessible to: all authenticated users (Morador, Admin, Root)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { condoSchema } = req;
    
    const suppliers = await suppliersService.listSuppliers(condoSchema);
    
    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('Error listing suppliers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/suppliers/:id
 * Get details of a specific supplier
 * Accessible to: all authenticated users
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { condoSchema } = req;
    const { id } = req.params;
    
    const supplier = await suppliersService.getSupplier(condoSchema, id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Fornecedor não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/suppliers
 * Suggest a new supplier
 * Accessible to: Morador users
 * Payload: { nome, categoria, descricao, telefone, email, endereco }
 */
router.post('/', authenticateToken, authorizeRole(['morador']), async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { nome, categoria, descricao, telefone, email, endereco } = req.body;
    
    // Validation
    if (!nome || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Nome e categoria são obrigatórios'
      });
    }
    
    const supplierData = {
      nome,
      categoria,
      descricao: descricao || null,
      telefone: telefone || null,
      email: email || null,
      endereco: endereco || null
    };
    
    const newSupplier = await suppliersService.suggestSupplier(
      condoSchema,
      supplierData,
      user.id
    );
    
    // Audit log
    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'SUGERIR_FORNECEDOR',
      entidade_tipo: 'fornecedor',
      entidade_id: newSupplier.id,
      detalhes: {
        nome: newSupplier.nome,
        categoria: newSupplier.categoria
      }
    });
    
    res.status(201).json({
      success: true,
      data: newSupplier,
      message: 'Fornecedor sugerido com sucesso'
    });
  } catch (error) {
    console.error('Error suggesting supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/suppliers/:id/notas
 * Upload an invoice for a supplier
 * Accessible to: Admin users only
 * Payload: { numero_nota, data_emissao, valor, descricao, arquivo_url }
 */
router.post('/:id/notas', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    const { numero_nota, data_emissao, valor, descricao, arquivo_url } = req.body;
    
    // Verify supplier exists
    const supplier = await suppliersService.getSupplier(condoSchema, id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Fornecedor não encontrado'
      });
    }
    
    // Validation
    if (!numero_nota || !data_emissao || valor === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Número da nota, data de emissão e valor são obrigatórios'
      });
    }
    
    const invoiceData = {
      numero_nota,
      data_emissao,
      valor: parseFloat(valor),
      descricao: descricao || null,
      arquivo_url: arquivo_url || null
    };
    
    const invoice = await suppliersService.uploadInvoice(
      condoSchema,
      id,
      invoiceData,
      user.id
    );
    
    // Audit log
    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'UPLOAD_NOTA_FISCAL',
      entidade_tipo: 'nota_fiscal',
      entidade_id: invoice.id,
      detalhes: {
        fornecedor_id: id,
        numero_nota: invoice.numero_nota,
        valor: invoice.valor
      }
    });
    
    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Nota fiscal enviada com sucesso'
    });
  } catch (error) {
    console.error('Error uploading invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/suppliers/:id/notas
 * Get all invoices for a supplier
 * Accessible to: all authenticated users
 */
router.get('/:id/notas', authenticateToken, async (req, res) => {
  try {
    const { condoSchema } = req;
    const { id } = req.params;
    
    const invoices = await suppliersService.getSupplierInvoices(condoSchema, id);
    
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/suppliers/:id
 * Remove a supplier
 * Accessible to: Admin users only
 * Note: Prevents deletion if supplier has associated invoices
 */
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { id } = req.params;
    
    // Verify supplier exists
    const supplier = await suppliersService.getSupplier(condoSchema, id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Fornecedor não encontrado'
      });
    }
    
    // Check if has invoices
    const invoices = await suppliersService.getSupplierInvoices(condoSchema, id);
    if (invoices && invoices.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Não é possível remover fornecedor com notas fiscais associadas'
      });
    }
    
    await suppliersService.removeSupplier(condoSchema, id);
    
    // Audit log
    await auditService.logAction(condoSchema, {
      usuario_id: user.id,
      acao: 'REMOVER_FORNECEDOR',
      entidade_tipo: 'fornecedor',
      entidade_id: id,
      detalhes: {
        nome: supplier.nome,
        categoria: supplier.categoria
      }
    });
    
    res.json({
      success: true,
      message: 'Fornecedor removido com sucesso'
    });
  } catch (error) {
    console.error('Error removing supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
