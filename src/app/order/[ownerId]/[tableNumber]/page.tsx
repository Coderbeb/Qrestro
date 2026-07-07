import prisma from '@/lib/db';
import OrderClient from './OrderClient';

export const revalidate = 60; // Cache this page at the edge for 60 seconds
export const dynamicParams = true;

export default async function OrderPage({ 
  params, 
}: { 
  params: Promise<{ ownerId: string; tableNumber: string }>;
}) {
  const { ownerId, tableNumber } = await params;

  const [owner, table] = await Promise.all([
    prisma.owner.findUnique({
      where: { id: ownerId },
      select: { id: true, restaurantName: true },
    }),
    prisma.table.findFirst({
      where: { ownerId, tableNumber: parseInt(tableNumber), isActive: true }
    })
  ]);

  if (!owner || !table) {
    return <OrderClient ownerId={ownerId} tableNumber={tableNumber} restaurant={null} categories={[]} uncategorized={[]} allItems={[]} serverError="Table not found or is currently inactive" />;
  }

  const [categoriesData, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { ownerId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.menuItem.findMany({
      where: { ownerId, isAvailable: true },
      orderBy: [{ categoryId: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        preparationTime: true,
        categoryId: true,
      },
    })
  ]);

  const formatted = items.map(item => ({
    ...item,
    price: parseFloat(item.price.toString()),
  }));

  const categorized = categoriesData.map(cat => ({
    ...cat,
    items: formatted.filter(i => i.categoryId === cat.id),
  })).filter(cat => cat.items.length > 0);

  const uncategorized = formatted.filter(i => !i.categoryId);

  return (
    <OrderClient 
      ownerId={ownerId} 
      tableNumber={tableNumber} 
      restaurant={owner as any} 
      categories={categorized as any} 
      uncategorized={uncategorized as any} 
      allItems={formatted as any} 
    />
  );
}
