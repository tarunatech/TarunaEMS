import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Lead from '../models/Lead.js';

const buildClientName = (client) => {
  if (!client) return '';
  return client.company || [client.firstName, client.lastName].filter(Boolean).join(' ') || client.email || '';
};

// Get all IT service purchase records with filters
export const getPurchaseOrders = async (req, res) => {
  try {
    const {
      status,
      vendor,
      supplier,
      serviceType,
      renewalMonth,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (serviceType && serviceType !== 'all') query.serviceType = serviceType;
    if (vendor || supplier) query.vendor = vendor || supplier;

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) {
          start.setUTCHours(0, 0, 0, 0);
          query.purchaseDate.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!Number.isNaN(end.getTime())) {
          end.setUTCHours(23, 59, 59, 999);
          query.purchaseDate.$lte = end;
        }
      }
    }

    if (renewalMonth) {
      const [year, month] = renewalMonth.split('-').map(Number);
      if (year && month) {
        query.renewalDate = {
          $gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
          $lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
        };
      }
    }

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { project: { $regex: search, $options: 'i' } },
        { serviceName: { $regex: search, $options: 'i' } }
      ];
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('client', 'leadId firstName lastName company email interestedProducts')
      .populate('createdBy', 'name email')
      .sort({ renewalDate: 1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchaseOrders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalPurchaseOrders: total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get IT service purchases error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Existing supplier endpoints are retained for compatibility, now labelled as providers in UI.
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .select('name email phone address')
      .sort({ name: 1 });

    res.json({ success: true, data: { suppliers } });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const { name, email, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Provider name is required' });
    }

    const provider = new Supplier({ name, email, phone, address, createdBy: req.user.id });
    await provider.save();

    res.status(201).json({ success: true, message: 'Provider created successfully', data: provider });
  } catch (error) {
    console.error('Create provider error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const poNumber = `PO-${Date.now()}`;
    let clientName = req.body.clientName;

    if (req.body.client) {
      const client = await Lead.findById(req.body.client);
      if (!client) return res.status(400).json({ success: false, message: 'Invalid client' });
      clientName = buildClientName(client);
    }

    const purchaseOrder = new PurchaseOrder({
      ...req.body,
      poNumber,
      clientName,
      client: req.body.client || undefined,
      amount: Number(req.body.amount || 0),
      totalAmount: Number(req.body.amount || 0),
      grandTotal: Number(req.body.amount || 0),
      createdBy: req.user.id
    });

    await purchaseOrder.save();
    await purchaseOrder.populate('client', 'leadId firstName lastName company email interestedProducts');
    await purchaseOrder.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'IT service purchase created successfully',
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Create IT service purchase error:', error);
    res.status(error.code === 11000 ? 400 : 500).json({
      success: false,
      message: error.code === 11000 ? 'PO number already exists' : error.message
    });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    if (purchaseOrder.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let clientName = req.body.clientName;
    if (req.body.client) {
      const client = await Lead.findById(req.body.client);
      if (!client) return res.status(400).json({ success: false, message: 'Invalid client' });
      clientName = buildClientName(client);
    }

    Object.assign(purchaseOrder, {
      ...req.body,
      clientName,
      client: req.body.client || undefined,
      amount: Number(req.body.amount || 0),
      totalAmount: Number(req.body.amount || 0),
      grandTotal: Number(req.body.amount || 0)
    });

    await purchaseOrder.save();
    await purchaseOrder.populate('client', 'leadId firstName lastName company email interestedProducts');
    await purchaseOrder.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'IT service purchase updated successfully',
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Update IT service purchase error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    if (purchaseOrder.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'IT service purchase deleted successfully' });
  } catch (error) {
    console.error('Delete IT service purchase error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
