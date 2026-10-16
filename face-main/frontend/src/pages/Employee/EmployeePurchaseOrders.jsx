import React from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { PurchaseOrdersView } from '../Admin/PurchaseOrders';

const EmployeePurchaseOrders = () => {
  return <PurchaseOrdersView Layout={EmployeeLayout} />;
};

export default EmployeePurchaseOrders;
