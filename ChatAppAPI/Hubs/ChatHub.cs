using ChatAppAPI.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using ChatAppAPI.Data;

namespace ChatAppAPI.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _applicationDbContext;

        public ChatHub(ApplicationDbContext applicationDbContext)
        {
            _applicationDbContext = applicationDbContext;
        }

        [Authorize]
        public async Task JoinChat()
        {
            var username = this.Context.User.Identity.Name;
            ApplicationUser user = _applicationDbContext.Users.FirstOrDefault(user => user.UserName == username);

            await Groups.AddToGroupAsync(this.Context.ConnectionId, user.Id);
        }

        [Authorize]
        public async Task SendMessage(string receiverId, string messageContent)
        {
            // Get current user (sender)
            var username = this.Context.User.Identity.Name;
            ApplicationUser user = _applicationDbContext.Users.FirstOrDefault(user => user.UserName == username);

            // Get receiver
            ApplicationUser receiver = _applicationDbContext.Users.FirstOrDefault(user => user.Id == receiverId);
            if (receiver == null)
            {
                return;
            }

            // Get chat
            List<string> ids = new List<string>()
            {
                receiver.Id,
                user.Id
            };

            Chat chat = _applicationDbContext.Chats
                .FromSql($"select Chats.* from Chats\r\nwhere Chats.Id in (\r\n\tselect ChatId from (\r\n\t\tselect ChatUsers.ChatId, count(distinct ChatUsers.UserId) as MemberCount \r\n\t\tfrom ChatUsers \r\n\t\twhere ChatUsers.UserId = {receiver.Id} or ChatUsers.UserId = {user.Id} \r\n\t\tgroup by ChatId\r\n\t) as asdf\r\n\twhere asdf.MemberCount >= {ids.Distinct().ToList().Count()}\r\n)")
                .FirstOrDefault();

            if (chat == null)
            {
                chat = new Chat();
                _applicationDbContext.Chats.Add(chat);
                _applicationDbContext.SaveChanges();

                List<ChatUser> chatUsers = new List<ChatUser>()
                {
                    new ChatUser()
                    {
                        ChatId = chat.Id,
                        UserId = user.Id,
                    },
                    new ChatUser()
                    {
                        ChatId = chat.Id,
                        UserId = receiverId,
                    }
                };
                _applicationDbContext.ChatUsers.AddRange(chatUsers);
                _applicationDbContext.SaveChanges();
            }

            // Save message to database
            Message message = new Message()
            {
                ChatId= chat.Id,
                UserId= user.Id,
                Content= messageContent
            };

            _applicationDbContext.Messages.Add(message);
            _applicationDbContext.SaveChanges();

            // Send message
            await Clients.GroupExcept(receiverId, new[] {this.Context.ConnectionId} ).SendAsync("ReceiveMessage", user.Id, message.Id, messageContent);
        }
    }
}
