import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Lead from '../models/Lead.js';
import Project from '../models/Project.js';
import { getSalesEmployeeScope } from '../utils/salesScope.js';

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

    if (req.query.projectId) {
      query.projectId = req.query.projectId;
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      if (scope.projectIds.length === 0 && scope.leadIds.length === 0) {
        return res.json({
          success: true,
          data: {
            purchaseOrders: [],
            pagination: {
              currentPage: Number(page),
              totalPages: 0,
              totalPurchaseOrders: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      }

      const scopeOr = [
        ...(scope.leadIds.length ? [{ client: { $in: scope.leadIds } }] : []),
        ...(scope.projectIds.length ? [{ projectId: { $in: scope.projectIds } }] : []),
        { createdBy: scope.userId }
      ];

      if (query.$or) {
        const searchConditions = query.$or;
        delete query.$or;
        query.$and = [
          { $or: searchConditions },
          { $or: scopeOr }
        ];
      } else {
        query.$or = scopeOr;
      }
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('client', 'leadId firstName lastName company email interestedProducts')
      .populate('projectId', 'id projectCode name')
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
    const scope = await getSalesEmployeeScope(req.user);
    const poNumber = `PO-${Date.now()}`;
    let clientName = req.body.clientName;

    if (req.body.client) {
      const client = await Lead.findById(req.body.client);
      if (!client) return res.status(400).json({ success: false, message: 'Invalid client' });
      clientName = buildClientName(client);
    }

    let resolvedProjectId = req.body.projectId || undefined;
    if (resolvedProjectId) {
      const projectDoc = await Project.findById(resolvedProjectId);
      if (!projectDoc) return res.status(400).json({ success: false, message: 'Invalid projectId' });
    } else if (req.body.project) {
      const pStr = String(req.body.project).trim();
      const codeMatch = pStr.match(/^(PRJ-\d{4}-\d{4})/i);
      const codeToSearch = codeMatch ? codeMatch[1] : null;

      const found = await Project.findOne({
        $or: [
          ...(codeToSearch ? [{ projectCode: codeToSearch }] : []),
          { projectCode: pStr },
          { name: pStr },
          ...(req.body.client ? [{ leadId: req.body.client }] : [])
        ]
      }).lean();

      if (found) {
        resolvedProjectId = found.id || found._id;
      }
    }

    if (scope.isScoped) {
      if (req.body.client && !scope.leadIds.includes(String(req.body.client))) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create purchase orders for your assigned clients.' });
      }
      if (resolvedProjectId && !scope.projectIds.includes(String(resolvedProjectId))) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create purchase orders for your assigned projects.' });
      }
    }

    const purchaseOrder = new PurchaseOrder({
      ...req.body,
      poNumber,
      clientName,
      client: req.body.client || undefined,
      projectId: resolvedProjectId || undefined,
      amount: Number(req.body.amount || 0),
      totalAmount: Number(req.body.amount || 0),
      grandTotal: Number(req.body.amount || 0),
      createdBy: req.user.id
    });

    await purchaseOrder.save();
    await purchaseOrder.populate('client', 'leadId firstName lastName company email interestedProducts');
    await purchaseOrder.populate('projectId', 'id projectCode name');
    await purchaseOrder.populate('createdBy', 'name email');

    req.app?.get?.('io')?.emit?.('finance:updated');

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

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const isCreator = String(purchaseOrder.createdBy) === String(scope.userId);
      const isProjectScoped = purchaseOrder.projectId && scope.projectIds.includes(String(purchaseOrder.projectId));
      const isClientScoped = purchaseOrder.client && scope.leadIds.includes(String(purchaseOrder.client));
      if (!isCreator && !isProjectScoped && !isClientScoped) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to modify this purchase order.' });
      }
    } else if (purchaseOrder.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let clientName = req.body.clientName;
    if (req.body.client) {
      const client = await Lead.findById(req.body.client);
      if (!client) return res.status(400).json({ success: false, message: 'Invalid client' });
      clientName = buildClientName(client);
    }

    let resolvedProjectId = req.body.projectId !== undefined ? req.body.projectId : purchaseOrder.projectId;
    if (resolvedProjectId) {
      const projectDoc = await Project.findById(resolvedProjectId);
      if (!projectDoc) return res.status(400).json({ success: false, message: 'Invalid projectId' });
    } else if (req.body.project) {
      const pStr = String(req.body.project).trim();
      const codeMatch = pStr.match(/^(PRJ-\d{4}-\d{4})/i);
      const codeToSearch = codeMatch ? codeMatch[1] : null;

      const found = await Project.findOne({
        $or: [
          ...(codeToSearch ? [{ projectCode: codeToSearch }] : []),
          { projectCode: pStr },
          { name: pStr },
          ...(req.body.client ? [{ leadId: req.body.client }] : [])
        ]
      }).lean();

      if (found) {
        resolvedProjectId = found.id || found._id;
      }
    }

    Object.assign(purchaseOrder, {
      ...req.body,
      clientName,
      client: req.body.client || undefined,
      projectId: resolvedProjectId || undefined,
      amount: Number(req.body.amount || 0),
      totalAmount: Number(req.body.amount || 0),
      grandTotal: Number(req.body.amount || 0)
    });

    await purchaseOrder.save();
    await purchaseOrder.populate('client', 'leadId firstName lastName company email interestedProducts');
    await purchaseOrder.populate('projectId', 'id projectCode name');
    await purchaseOrder.populate('createdBy', 'name email');

    req.app?.get?.('io')?.emit?.('finance:updated');

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

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const isCreator = String(purchaseOrder.createdBy) === String(scope.userId);
      const isProjectScoped = purchaseOrder.projectId && scope.projectIds.includes(String(purchaseOrder.projectId));
      const isClientScoped = purchaseOrder.client && scope.leadIds.includes(String(purchaseOrder.client));
      if (!isCreator && !isProjectScoped && !isClientScoped) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete this purchase order.' });
      }
    } else if (purchaseOrder.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'IT service purchase deleted successfully' });
  } catch (error) {
    console.error('Delete IT service purchase error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
