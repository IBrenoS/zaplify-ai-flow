import { useState } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Link2, Plus, Crown, CalendarDays, UserCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "day" | "week" | "month" | "list";

interface Event {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  description?: string;
  type: "ai-scheduled" | "manual" | "personal";
  linkedContact?: string;
}

const Agenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "Corte - João Silva",
      date: new Date(),
      startTime: "15:00",
      endTime: "16:00",
      description: "Corte de cabelo agendado via IA",
      type: "ai-scheduled",
      linkedContact: "João Silva"
    },
    {
      id: "2",
      title: "Reunião Equipe",
      date: addDays(new Date(), 1),
      startTime: "14:00",
      endTime: "15:30",
      description: "Reunião semanal da equipe",
      type: "manual"
    },
    {
      id: "3",
      title: "Almoço com cliente",
      date: addDays(new Date(), 2),
      startTime: "12:00",
      endTime: "13:30",
      description: "Almoço de negócios",
      type: "personal"
    }
  ]);

  const [newEvent, setNewEvent] = useState({
    title: "",
    date: new Date(),
    startTime: "",
    endTime: "",
    description: "",
    linkedContact: ""
  });

  const getEventColor = (type: Event["type"]) => {
    switch (type) {
      case "ai-scheduled":
        return "bg-gradient-zaplify text-white border-primary";
      case "manual":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "personal":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    switch (viewMode) {
      case "day":
        setCurrentDate(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        break;
    }
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
      case "week":
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: ptBR });
      case "list":
        return "Lista de Eventos";
      default:
        return "";
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const getEventsInRange = () => {
    switch (viewMode) {
      case "day":
        return getEventsForDate(currentDate);
      case "week":
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        return events.filter(event => 
          isWithinInterval(event.date, { start: weekStart, end: weekEnd })
        );
      case "month":
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return events.filter(event => 
          isWithinInterval(event.date, { start: monthStart, end: monthEnd })
        );
      case "list":
        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
      default:
        return [];
    }
  };

  const handleCreateEvent = () => {
    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      description: newEvent.description,
      type: "manual",
      linkedContact: newEvent.linkedContact
    };
    
    setEvents([...events, event]);
    setNewEvent({
      title: "",
      date: new Date(),
      startTime: "",
      endTime: "",
      description: "",
      linkedContact: ""
    });
    setIsModalOpen(false);
  };

  const renderCalendarView = () => {
    switch (viewMode) {
      case "month":
        return (
          <div className="glass-card p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentDate}
              onMonthChange={setCurrentDate}
              className="w-full pointer-events-auto"
              components={{
                Day: ({ date, ...props }) => {
                  const dayEvents = getEventsForDate(date);
                  return (
                    <div className="relative p-2 min-h-[80px]">
                      <div className="text-sm font-medium mb-1">{date.getDate()}</div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded border ${getEventColor(event.type)} truncate`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              }}
            />
          </div>
        );
      
      case "week":
        const weekDays = [];
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        for (let i = 0; i < 7; i++) {
          weekDays.push(addDays(weekStart, i));
        }
        
        return (
          <div className="glass-card p-6">
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map(day => (
                <div key={day.toISOString()} className="border rounded-lg p-4 min-h-[300px]">
                  <div className="font-semibold mb-2">
                    {format(day, "EEE dd", { locale: ptBR })}
                  </div>
                  <div className="space-y-2">
                    {getEventsForDate(day).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-2 rounded border ${getEventColor(event.type)}`}
                      >
                        <div className="font-medium">{event.startTime}</div>
                        <div>{event.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "day":
        const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h às 19h
        return (
          <div className="glass-card p-6">
            <div className="space-y-2">
              {hours.map(hour => (
                <div key={hour} className="flex items-center border-b pb-2">
                  <div className="w-16 text-sm text-muted-foreground">
                    {hour}:00
                  </div>
                  <div className="flex-1 ml-4 min-h-[60px] relative">
                    {getEventsForDate(currentDate)
                      .filter(event => parseInt(event.startTime.split(':')[0]) === hour)
                      .map(event => (
                        <div
                          key={event.id}
                          className={`p-3 rounded border ${getEventColor(event.type)} mb-2`}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm">{event.startTime} - {event.endTime}</div>
                          {event.linkedContact && (
                            <div className="flex items-center gap-1 text-xs mt-1">
                              <Link2 className="h-3 w-3" />
                              {event.linkedContact}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "list":
        return (
          <div className="glass-card p-6">
            <div className="space-y-4">
              {getEventsInRange().map(event => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border ${getEventColor(event.type)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <div className="text-sm">
                      {format(event.date, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {event.startTime} - {event.endTime}
                    </div>
                    {event.linkedContact && (
                      <div className="flex items-center gap-1">
                        <Link2 className="h-4 w-4" />
                        {event.linkedContact}
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
    }
  };


  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-poppins font-bold gradient-text mb-2">
              Agenda
            </h1>
            <p className="text-xl text-muted-foreground">
              Gerencie eventos, reuniões e follow-ups
            </p>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-zaplify hover:shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Digite o título do evento"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startTime">Hora Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endTime">Hora Fim</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="linkedContact">Vincular Contato</Label>
                  <Select onValueChange={(value) => setNewEvent({...newEvent, linkedContact: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contato do Inbox" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="João Silva">João Silva</SelectItem>
                      <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                      <SelectItem value="Pedro Costa">Pedro Costa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="Adicione detalhes sobre o evento"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateEvent} className="bg-gradient-zaplify">
                  Salvar Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Navigation and View Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateDate("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </Button>
            </div>
            
            <h2 className="text-2xl font-semibold">{getViewTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {(["day", "week", "month", "list"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "outline"}
                onClick={() => setViewMode(mode)}
                className={viewMode === mode ? "bg-gradient-zaplify" : ""}
              >
                {mode === "day" ? "Dia" : 
                 mode === "week" ? "Semana" : 
                 mode === "month" ? "Mês" : "Lista"}
              </Button>
            ))}
          </div>
        </div>

        {/* Calendar View */}
        {renderCalendarView()}

        {/* Legend */}
        <div className="mt-6 glass-card p-4">
          <h3 className="font-semibold mb-3">Legenda:</h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-zaplify"></div>
              <span className="text-sm">Agendados pela IA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/40 border border-blue-500/60"></div>
              <span className="text-sm">Eventos Manuais</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500/40 border border-purple-500/60"></div>
              <span className="text-sm">Agenda Pessoal</span>
            </div>
          </div>
        </div>
      </main>
    </ResponsiveLayout>
  );
};

export default Agenda;