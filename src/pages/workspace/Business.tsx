import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Plus, Star, DollarSign, Package, MessageSquare } from "lucide-react";
import { businessAPI } from "@/lib/api";
import { toast } from "sonner";

interface Order {
  id: string;
  clientName: string;
  description: string;
  status: "новый" | "в работе" | "завершен" | "отменен";
  price: number;
  deadline: string;
  linkedTaskId?: string;
}

interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
}

const Business = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState({
    clientName: "",
    description: "",
    price: "",
    deadline: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, reviewsData] = await Promise.all([
        businessAPI.getOrders(),
        businessAPI.getReviews()
      ]);
      setOrders(ordersData.orders || []);
      setReviews(reviewsData.reviews || []);
    } catch (error) {
      console.error('Failed to load business data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async () => {
    if (!newOrder.clientName || !newOrder.description || !newOrder.price) return;

    try {
      const result = await businessAPI.createOrder({
        client_name: newOrder.clientName,
        description: newOrder.description,
        status: "новый",
        price: Number(newOrder.price),
        deadline: newOrder.deadline,
      });

      setOrders([...orders, result.order]);
      setShowNewOrder(false);
      setNewOrder({ clientName: "", description: "", price: "", deadline: "" });
      toast.success('Заказ создан');
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error('Не удалось создать заказ');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: Order["status"]) => {
    try {
      const result = await businessAPI.updateOrder(id, { status });
      setOrders(orders.map((order) =>
        order.id === id ? result.order : order
      ));
      toast.success('Статус обновлен');
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Не удалось обновить статус');
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "новый":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "в работе":
        return "bg-purple-500/10 text-purple-500 border-purple-500/30";
      case "завершен":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "отменен":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "";
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "завершен" && o.status !== "отменен").length;
  const totalRevenue = orders
    .filter((o) => o.status === "завершен")
    .reduce((sum, o) => sum + o.price, 0);
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container max-w-screen-xl mx-auto p-4 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/workspace")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад к Workspace
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Для бизнеса</h1>
            <p className="text-muted-foreground mt-1">
              Управление заказами и клиентами
            </p>
          </div>
          <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Новый заказ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить новый заказ</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Имя клиента</label>
                  <Input
                    value={newOrder.clientName}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, clientName: e.target.value })
                    }
                    placeholder="Введите имя клиента"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Описание</label>
                  <Textarea
                    value={newOrder.description}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, description: e.target.value })
                    }
                    placeholder="Описание заказа"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Цена (₽)</label>
                  <Input
                    type="number"
                    value={newOrder.price}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, price: e.target.value })
                    }
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Дедлайн</label>
                  <Input
                    type="date"
                    value={newOrder.deadline}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, deadline: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleAddOrder} className="w-full">
                  Добавить заказ
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue" />
              <span className="text-sm text-muted-foreground">Активные заказы</span>
            </div>
            <p className="text-3xl font-bold text-blue">{activeOrders}</p>
          </Card>

          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-purple" />
              <span className="text-sm text-muted-foreground">Выручка</span>
            </div>
            <p className="text-3xl font-bold text-purple">{totalRevenue.toLocaleString()} ₽</p>
          </Card>

          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-pink" />
              <span className="text-sm text-muted-foreground">Средний рейтинг</span>
            </div>
            <p className="text-3xl font-bold text-pink">{averageRating}</p>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Заказы</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.clientName}</TableCell>
                    <TableCell className="max-w-xs truncate">{order.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.price.toLocaleString()} ₽</TableCell>
                    <TableCell>{new Date(order.deadline).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleUpdateOrderStatus(order.id, value as Order["status"])
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="новый">новый</SelectItem>
                          <SelectItem value="в работе">в работе</SelectItem>
                          <SelectItem value="завершен">завершен</SelectItem>
                          <SelectItem value="отменен">отменен</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Reviews */}
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Отзывы клиентов</h3>
          </div>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{review.clientName}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.date).toLocaleDateString("ru-RU")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Business;
