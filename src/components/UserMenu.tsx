import React from 'react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, Library, Share2, BookOpen, BarChart2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface UserMenuProps {
  user: { name: string; email: string };
  onLogout: () => void;
  onViewLibrary: () => void;
  onViewSettings: () => void;
  onViewAdmin?: () => void;
  onViewDepartments?: () => void;
  onViewDashboard?: () => void;
}

export function UserMenu({ user, onLogout, onViewLibrary, onViewSettings, onViewAdmin, onViewDashboard, onViewDepartments }: UserMenuProps) {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const menuItem = (onClick: () => void, Icon: any, label: string, danger = false) => (
    <DropdownMenuItem
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${danger ? 'hover:bg-destructive/10 text-destructive focus:bg-destructive/10' : 'hover:bg-secondary focus:bg-secondary'}`}
      onClick={onClick}>
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 outline-none group">
        <span className="text-sm font-medium hidden sm:inline-block group-hover:text-accent transition-colors">{user.name}</span>
        <Avatar className="w-8 h-8 border border-border group-hover:border-accent transition-colors">
          <AvatarImage src="" />
          <AvatarFallback className="bg-secondary text-[10px] font-bold">{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2 border-border shadow-xl rounded-xl p-2 bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold">{user.name}</span>
              <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuGroup>
          {menuItem(onViewLibrary, Library, 'My Library')}
          {menuItem(onViewDepartments || (() => {}), Users, 'Departments')}
          {menuItem(handleShare, Share2, 'Share App')}
          {menuItem(onViewSettings, Settings, 'Settings')}
        </DropdownMenuGroup>
        {onViewAdmin && (
          <>
            <DropdownMenuSeparator className="my-1 bg-border/50" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-accent/10 focus:bg-accent/10 transition-colors" onClick={onViewDashboard}>
                <BarChart2 className="w-4 h-4 text-purple-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-purple-600">Admin Dashboard</span>
                  <span className="text-[10px] text-muted-foreground">Usage & analytics</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-accent/10 focus:bg-accent/10 transition-colors" onClick={onViewAdmin}>
                <BookOpen className="w-4 h-4 text-accent" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-accent">Research Library</span>
                  <span className="text-[10px] text-muted-foreground">Upload research PDFs</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuGroup>
          {menuItem(onLogout, LogOut, 'Log Out', true)}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
