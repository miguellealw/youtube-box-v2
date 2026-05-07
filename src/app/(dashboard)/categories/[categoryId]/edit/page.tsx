import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/db"
import { categories } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { updateCategory } from "@/actions/categories"
import { CategoryForm } from "@/components/category-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  const session = await auth()
  const userId = session!.user!.id!

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)

  if (!category) notFound()

  const boundAction = updateCategory.bind(null, categoryId)

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
        <h1 className="text-2xl font-bold">Edit Category</h1>
      </div>
      <CategoryForm
        action={boundAction}
        category={category}
        submitLabel="Save changes"
      />
    </div>
  )
}
