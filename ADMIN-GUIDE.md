# JustSell POS System - Administrator Guide

## 📋 Overview

This guide provides comprehensive instructions for system administrators to configure, maintain, and support the JustSell POS system. It covers daily operations, troubleshooting, user management, and system optimization.

## 🚀 Initial System Setup

### First Login & Admin Account Setup

1. **Access the System**
   - Navigate to your POS system URL: `https://yourdomain.com`
   - Login with the initial admin credentials created during installation
   - **Default Admin**: Email set during installation, password provided in setup

2. **Secure Your Admin Account**
   - Go to **Profile Settings** (top right menu)
   - Change default password to a strong password (12+ characters)
   - Enable two-factor authentication if available
   - Update contact information

3. **Initial System Configuration**
   - Configure store information
   - Set up user roles and permissions
   - Configure tax settings
   - Set up QuickBooks integration (if applicable)

## 🏢 Store Configuration

### Store Location Setup

**Path**: Admin Dashboard → Settings → Store Locations

1. **Add Your Store**
   ```
   Store Name: [Your Store Name]
   Address: [Complete address with ZIP code]
   Phone: [Contact number]
   Email: [Store email]
   Tax ID: [Business tax ID]
   Timezone: [Select appropriate timezone]
   ```

2. **Store Settings**
   - **Business Hours**: Set operational hours for reporting
   - **Currency**: USD (default)
   - **Receipt Settings**: Configure receipt header/footer information
   - **Compliance Settings**: Enable tobacco retail compliance features

### Tax Configuration

**Path**: Admin Dashboard → Settings → Tax Settings

1. **State Tax Setup**
   - Select your business state
   - System will auto-configure standard sales tax rates
   - Verify tax rates match your local requirements

2. **Special Tax Categories**
   ```
   Tobacco Tax: Automatically calculated based on state
   Alcohol Tax: Configure if selling alcohol products
   Local Taxes: Add city/county taxes if applicable
   ```

3. **Tax Exemption Settings**
   - Enable tax exemption customer support
   - Configure exempt organization categories
   - Set up tax exemption verification process

## 👥 User Management

### Creating User Accounts

**Path**: Admin Dashboard → Users → Add New User

1. **User Information**
   ```
   First Name: [Employee first name]
   Last Name: [Employee last name]  
   Email: [Work email address]
   Phone: [Contact number]
   Employee ID: [Internal employee ID]
   ```

2. **Role Assignment**
   - **ADMIN**: Full system access, user management, reports
   - **MANAGER**: Store management, reports, customer management
   - **CASHIER**: POS operations, basic customer lookup

3. **Store Assignment**
   - Assign user to specific store location(s)
   - Multi-store users can access multiple locations
   - Set primary store for reporting

### User Permissions Matrix

| Feature | ADMIN | MANAGER | CASHIER |
|---------|--------|---------|---------|
| POS Operations | ✅ | ✅ | ✅ |
| Product Management | ✅ | ✅ | View Only |
| Customer Management | ✅ | ✅ | Basic Access |
| Inventory Management | ✅ | ✅ | View Only |
| Reports & Analytics | ✅ | ✅ | Limited |
| User Management | ✅ | Limited | ❌ |
| System Settings | ✅ | ❌ | ❌ |
| QuickBooks Integration | ✅ | View Only | ❌ |
| Age Verification Override | ✅ | ✅ | ❌ |

### Managing Existing Users

1. **Edit User Details**
   - Update contact information
   - Change role assignments
   - Modify store access
   - Reset passwords

2. **Deactivate Users**
   - Set user status to "Inactive" instead of deleting
   - Maintains transaction history and audit trail
   - Can reactivate if employee returns

3. **Password Management**
   - Users can reset their own passwords via email
   - Admins can force password resets
   - Set password complexity requirements

## 📦 Product & Inventory Management

### Adding Products

**Path**: Admin Dashboard → Products → Add Product

1. **Basic Information**
   ```
   Product Name: [Clear, descriptive name]
   SKU: [Internal stock keeping unit]
   Barcode: [UPC/EAN barcode if available]
   Category: [Select appropriate category]
   Vendor: [Supplier/manufacturer name]
   ```

2. **Pricing**
   ```
   Retail Price: $[Sale price to customers]
   Cost Price: $[Your wholesale cost - optional]
   ```

3. **Inventory Settings**
   ```
   Current Stock: [Available quantity]
   Minimum Stock Level: [Reorder threshold]
   Track Inventory: [Enable/disable inventory tracking]
   ```

4. **Compliance Settings**
   ```
   Age Restricted: ✅ [Required for tobacco/vape products]
   Product Type: [Tobacco/Vape/Accessories/Other]
   Flavor Profile: [If applicable]
   Nicotine Strength: [mg/ml if applicable]
   ```

### Bulk Product Import

1. **Download Template**
   - Go to Products → Import Products
   - Download CSV template
   - Fill in product information

2. **Import Process**
   - Upload completed CSV file
   - Review import preview
   - Confirm import to add products

3. **Template Format**
   ```csv
   name,sku,barcode,price,cost,quantity,category,vendor,age_restricted
   "Vape Pen Kit","VP001","123456789","29.99","15.00","50","Vape Kits","VapeSupply Co",TRUE
   ```

### Inventory Management

1. **Stock Adjustments**
   - Manually adjust inventory levels
   - Add reason for adjustment (received shipment, damage, theft)
   - System maintains adjustment history

2. **Low Stock Alerts**
   - Configure automatic low stock notifications
   - Set minimum levels per product
   - Receive alerts via email or dashboard

3. **Inventory Reports**
   - Current stock levels
   - Low stock report
   - Inventory valuation
   - Movement history

## 🎯 Customer Management

### Customer Database

**Path**: Admin Dashboard → Customers

1. **Adding Customers**
   ```
   Personal Information:
   - First Name, Last Name
   - Date of Birth (required for age verification)
   - Phone Number (for lookup)
   - Email Address (optional)
   
   Address Information:
   - Street Address
   - City, State, ZIP Code
   
   Preferences:
   - Marketing Opt-in
   - SMS Notifications
   ```

2. **Loyalty Program**
   - **Bronze**: $0 - $499 total spent
   - **Silver**: $500 - $1,999 total spent  
   - **Gold**: $2,000 - $4,999 total spent
   - **Platinum**: $5,000+ total spent

3. **Customer Search**
   - Search by name, phone, or email
   - Quick lookup during checkout
   - View purchase history and preferences

### Age Verification Management

1. **Verification Records**
   - All age verification attempts are logged
   - View verification history per customer
   - Track manager overrides and reasons

2. **Compliance Reporting**
   - Generate age verification reports
   - Export for compliance audits
   - Monitor override frequency

## 📊 Reports & Analytics

### Daily Operations Reports

1. **Daily Sales Summary**
   - Total sales by payment method
   - Top selling products
   - Transaction count
   - Average transaction value

2. **Cash Management**
   - Cash drawer starting amount
   - Total cash sales
   - Expected cash in drawer
   - Cash over/under reports

### Business Intelligence Reports

1. **Sales Performance**
   ```
   Daily/Weekly/Monthly sales trends
   Year-over-year comparisons  
   Product category performance
   Peak sales hours/days
   ```

2. **Customer Analytics**
   ```
   New vs returning customers
   Customer lifetime value
   Loyalty program effectiveness
   Geographic analysis
   ```

3. **Inventory Reports**
   ```
   Inventory turnover rates
   Dead stock identification
   Reorder recommendations  
   Supplier performance
   ```

### Compliance Reports

1. **Age Verification Reports**
   - Verification success rates
   - Manager override frequency
   - Failed verification patterns
   - Compliance audit trail

2. **Tax Reports**
   - Sales tax collected by jurisdiction
   - Tax-exempt sales tracking
   - Tobacco tax calculations
   - Monthly/quarterly tax summaries

## 💼 QuickBooks Integration

### Initial Setup

**Path**: Admin Dashboard → QuickBooks Integration

1. **Connect to QuickBooks**
   - Click "Connect to QuickBooks"
   - Authorize access to your QuickBooks Online account
   - Select the correct company file
   - Complete authorization process

2. **Account Mapping**
   ```
   Sales Revenue Account: [Map to your sales income account]
   Sales Tax Payable: [Map to tax liability account]  
   Cash Account: [Map to your cash account]
   Credit Card Account: [Map to card processing account]
   Gift Card Outstanding: [Map to gift card liability]
   Inventory Asset: [Map to inventory asset account]
   Cost of Goods Sold: [Map to COGS account]
   ```

3. **Sync Configuration**
   - **Auto Sync**: Enable for real-time synchronization
   - **Sync Frequency**: Set to every 15 minutes (recommended)
   - **Sync History**: Configure how far back to sync transactions

### Daily QuickBooks Operations

1. **Monitor Sync Status**
   - Check sync dashboard daily
   - Review any sync errors
   - Resolve conflicts promptly

2. **Sync Operations**
   ```
   Manual Sync: Force sync when needed
   Sync All Items: Full inventory synchronization
   Customer Sync: Update customer information
   Transaction Sync: Sync recent sales
   ```

3. **Troubleshooting Sync Issues**
   - Check QuickBooks connection status
   - Verify account mappings
   - Review error logs
   - Reconnect if authentication expires

### Monthly QuickBooks Tasks

1. **Reconciliation**
   - Compare POS reports with QuickBooks
   - Verify all transactions synced correctly
   - Check inventory valuations match

2. **Reporting**
   - Generate combined reports using QuickBooks data
   - Review profit & loss integration
   - Verify tax calculation accuracy

## 🔧 System Maintenance

### Daily Tasks

1. **System Health Check**
   - Verify system is responsive
   - Check for error notifications
   - Review overnight sync status
   - Confirm backups completed

2. **Data Validation**
   - Check for transaction discrepancies
   - Verify inventory levels
   - Review cash management reports
   - Monitor user activity logs

### Weekly Tasks

1. **User Management**
   - Review user access logs
   - Check for inactive accounts
   - Update user permissions as needed
   - Review security notifications

2. **Data Maintenance**
   - Clear temporary files
   - Archive old transaction data
   - Update product information
   - Clean up customer database

### Monthly Tasks

1. **System Updates**
   - Install security updates
   - Update product database
   - Review system performance
   - Plan capacity upgrades

2. **Backup Verification**
   - Test backup restoration process
   - Verify backup integrity
   - Update backup procedures
   - Document recovery processes

3. **Compliance Review**
   - Review age verification compliance
   - Generate compliance reports
   - Update regulatory procedures
   - Train staff on new requirements

## 🚨 Troubleshooting Guide

### Common Issues

#### POS Terminal Not Responding
1. Check network connection
2. Refresh browser (Ctrl+F5 or Cmd+Shift+R)
3. Clear browser cache and cookies
4. Check with other devices
5. Contact system administrator if issue persists

#### Transaction Processing Errors
1. Verify payment method configuration
2. Check inventory levels
3. Confirm user permissions
4. Review error logs
5. Retry transaction with different payment method

#### Age Verification Issues
1. Verify ID information is entered correctly
2. Check date format (MM/DD/YYYY)
3. Ensure ID is not expired
4. Use manager override if appropriate
5. Document override reason clearly

#### Sync Issues with QuickBooks
1. Check QuickBooks connection status
2. Verify internet connectivity
3. Refresh authentication token
4. Review account mapping
5. Contact QuickBooks support if needed

### Performance Issues

#### Slow Loading Times
1. Check internet connection speed
2. Clear browser cache
3. Disable unnecessary browser extensions
4. Use recommended browsers (Chrome, Firefox, Safari)
5. Contact IT support for server performance

#### Database Issues
1. Monitor database performance metrics
2. Check for long-running queries
3. Review index optimization
4. Archive old data regularly
5. Plan database maintenance windows

### Emergency Procedures

#### System Outage
1. **Immediate Actions**
   - Document outage start time
   - Check network connectivity
   - Verify server status
   - Contact hosting provider

2. **Temporary Measures**
   - Use offline cash register if available
   - Manually record sales for later entry
   - Process cards with backup terminal
   - Notify staff of procedures

3. **Recovery Process**
   - Restore from last backup if needed
   - Verify data integrity
   - Enter manual transactions
   - Resume normal operations

#### Data Loss/Corruption
1. Stop all system operations immediately
2. Do not attempt repairs without expertise
3. Contact technical support
4. Prepare to restore from backup
5. Document incident for analysis

## 📞 Support Resources

### Internal Support Contacts

```
System Administrator: [Your IT contact]
Phone: [Support phone number]
Email: [Support email]
Hours: [Support availability]

Backup Contact: [Secondary support]
Phone: [Backup phone number]
Email: [Backup email]
```

### External Support

```
Hosting Provider: [Hosting company]
Support Phone: [Provider support number]
Account ID: [Your account identifier]

QuickBooks Support: 1-800-446-8848
Web: https://quickbooks.intuit.com/support/

POS System Development Team:
Email: [Development team email]
Documentation: [System documentation URL]
```

### Documentation Resources

1. **User Guides**
   - POS Terminal User Guide
   - Admin Configuration Guide (this document)
   - QuickBooks Integration Guide

2. **Technical Documentation**  
   - System Implementation Guide
   - API Documentation
   - Database Schema Reference

3. **Training Materials**
   - New User Training Videos
   - Feature Tutorial Library
   - Troubleshooting Guides

## 📚 Compliance & Legal

### Record Keeping Requirements

1. **Transaction Records**
   - Maintain all transaction data for 7 years
   - Include payment methods and receipts
   - Preserve age verification records
   - Store audit trail information

2. **Age Verification**
   - Keep verification records for compliance
   - Document all manager overrides
   - Maintain ID verification logs
   - Regular compliance reporting

3. **Tax Records**
   - Preserve all tax calculations
   - Maintain exemption certificates
   - Keep jurisdiction tax records
   - Quarterly and annual summaries

### Privacy & Security

1. **Customer Data Protection**
   - Encrypt sensitive information
   - Limit access to authorized users
   - Regular security audits
   - Secure data disposal procedures

2. **Employee Data Security**
   - Secure user account management
   - Regular password updates
   - Access control monitoring
   - Security training requirements

### Regulatory Compliance

1. **Tobacco Retail Compliance**
   - Age verification procedures
   - Product labeling requirements
   - Sales restriction compliance
   - Regular compliance training

2. **Payment Processing Compliance**
   - PCI DSS requirements
   - Secure payment handling
   - Regular security assessments
   - Incident response procedures

---

## Quick Reference Cards

### Daily Admin Checklist
- [ ] Check system health dashboard
- [ ] Review overnight sync status  
- [ ] Verify backup completion
- [ ] Check for system alerts
- [ ] Review daily sales summary
- [ ] Monitor inventory levels
- [ ] Check user activity logs

### Weekly Admin Tasks
- [ ] Review user access and permissions
- [ ] Update product information
- [ ] Clean customer database
- [ ] Check system performance
- [ ] Review compliance reports
- [ ] Test backup procedures
- [ ] Update documentation

### Monthly Admin Tasks
- [ ] System security review
- [ ] Performance optimization
- [ ] Data archival procedures
- [ ] Compliance audit preparation
- [ ] User training updates
- [ ] Vendor system updates
- [ ] Disaster recovery testing

---

**Questions or Need Additional Support?**
Contact your system administrator or refer to the technical documentation for detailed troubleshooting procedures.