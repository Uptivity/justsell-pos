import { Request, Response, NextFunction } from 'express'
import { hasPermission } from '../../shared/services/auth'
import type { Permission } from '../../shared/types/auth'

export const checkPermission = (requiredPermission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user

    if (!user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (!hasPermission(user.role, requiredPermission)) {
      res.status(403).json({ 
        message: 'Insufficient permissions',
        required: requiredPermission,
        userRole: user.role
      })
      return
    }

    next()
  }
}