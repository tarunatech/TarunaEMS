import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';

// Get all purchase orders with filters
export const getPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier, startDate, endDate, search, page = 1, limit = 50 } = req.query;

    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Supplier filter
    if (supplier && supplier.trim() !== '' && mongoose.Types.ObjectId.isValid(supplier.trim())) {
      query.supplier = supplier.trim();
    }

    // Date range filter (on createdAt)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setUTCHours(0, 0, 0, 0);
          query.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setUTCHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { 'lineItems.item': { $regex: search, $options: 'i' } },
        { 'lineItems.description': { $regex: search, $options: 'i' } }
      ];
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchaseOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPurchaseOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .select('name email phone address')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        suppliers
      }
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new supplier
export const createSupplier = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { name, email, phone, address } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Check if supplier already exists (only check provided fields)
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    if (orConditions.length > 0) {
      const existingSupplier = await Supplier.findOne({ $or: orConditions });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: 'Supplier with this email or phone already exists'
        });
      }
    }

    const supplier = new Supplier({
      name,
      email,
      phone,
      address,
      createdBy: req.user.id
    });

    await supplier.save();

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });

  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Create new purchase order
export const createPurchaseOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { supplier, ...poData } = req.body;

    // Validate supplier exists
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier'
      });
    }

    // Generate PO number
    const poNumber = `PO-${Date.now()}`;

    const purchaseOrder = new PurchaseOrder({
      ...poData,
      poNumber,
      supplier,
      createdBy: req.user.id
    });

    await purchaseOrder.save();
    await purchaseOrder.populate('supplier', 'name email phone');
    await purchaseOrder.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: purchaseOrder
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    if (error.code === 11000) { // Duplicate key
      res.status(400).json({
        success: false,
        message: 'PO number already exists'
      });
    } else {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};

// Update purchase order
export const updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Check ownership or admin access
    if (purchaseOrder.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own purchase orders.'
      });
    }

    const { supplier, ...updateData } = req.body;

    // Validate supplier if provided
    if (supplier) {
      const supplierDoc = await Supplier.findById(supplier);
      if (!supplierDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid supplier'
        });
      }
      updateData.supplier = supplier;
    }

    Object.assign(purchaseOrder, updateData);
    await purchaseOrder.save();
    await purchaseOrder.populate('supplier', 'name email phone');
    await purchaseOrder.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: purchaseOrder
    });

  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete purchase order
export const deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Check ownership or admin access
    if (purchaseOrder.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own purchase orders.'
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });

  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
