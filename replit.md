# Restaurant Management System

## Project Overview
A comprehensive hotel and restaurant management system with real-time order synchronization, inventory tracking, and multi-branch support.

## Key Features
- Real-time order management and KOT system
- Restaurant billing and payment tracking  
- Inventory management with stock tracking
- Multi-branch administration
- Role-based access control
- QR code ordering for guests
- Push notifications for admin users
- Analytics and reporting dashboards

## Architecture
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React with Vite, TailwindCSS, shadcn/ui
- **Real-time Updates**: Polling-based system (2-3 second intervals)
- **Authentication**: Session-based with role permissions

## Recent Changes (June 24, 2025)
- ✅ Successfully migrated project to Replit environment
- ✅ Fixed dependency issues (tsx, drizzle-kit)
- ✅ Resolved WebSocket conflicts with Vite HMR
- ✅ Implemented real-time synchronization using polling
- ✅ Added WebSocket broadcasts to all order-related operations
- ✅ Configured automatic query invalidation for immediate updates
- ✅ Verified real-time order status updates working properly

## Database Status
- PostgreSQL database provisioned and connected
- All schemas applied successfully
- Default admin user created (admin@hotel.com / admin123)

## Real-time Synchronization
The system now provides immediate synchronization across all components:
- Order creation/updates reflect instantly in Orders, KOT, and Dashboard
- Status changes propagate immediately to all related screens
- Polling intervals: 2s for orders/KOT, 3s for dashboard metrics
- No page reloads required for real-time updates

## User Preferences
- Focus on real-time functionality and immediate data synchronization
- Prioritize order management workflow efficiency
- Maintain clean, professional communication