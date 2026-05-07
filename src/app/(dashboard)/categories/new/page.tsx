import { createCategory } from "@/actions/categories"
import { CategoryForm } from "@/components/category-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function NewCategoryPage() {
  return (
    <div className="max-w-md space-y-6">
      <div>
        <Link
          href="/categories"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to categories
        </Link>
        <h1 className="text-2xl font-bold">New Category</h1>
      </div>
      <CategoryForm action={createCategory} submitLabel="Create category" />
    </div>
  )
}
