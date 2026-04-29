'use client'

import { ShipmentTable } from '@/components/ShipmentTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter } from 'lucide-react'

export default function ShipmentsPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Shipments Management</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Shipment
        </Button>
      </div>

      <div className="flex items-center gap-4 py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking number, customer, or destination..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-1">
        <ShipmentTable />
      </div>
    </div>
  )
}
