using ChatAppAPI.Data;
using ChatAppAPI.Model;
using ChatAppAPI.Presenter;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatAppAPI.Controllers
{
    [Route("api/chat")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly ApplicationDbContext _applicationDbContext;

        public ChatController(ApplicationDbContext applicationDbContext)
        {
            _applicationDbContext = applicationDbContext;
        }

        [Authorize]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = _applicationDbContext.Users.ToList();

            List<UserPresenter> usersPresenter = new List<UserPresenter>();
            foreach (var user in users)
            {
                usersPresenter.Add(new UserPresenter()
                {
                    Id= user.Id,
                    Username= user.UserName,
                });
            }


            return Ok(usersPresenter);
        }

        [Authorize]
        [HttpGet("messages")]
        public async Task<IActionResult> GetMessagesInTheChat(string receiverId)
        {
            // Get current user
            var username = User.Identity.Name;
            ApplicationUser user = _applicationDbContext.Users.FirstOrDefault(user => user.UserName == username);

            // Verify if receiver exists
            ApplicationUser receiver = _applicationDbContext.Users.FirstOrDefault(user => user.Id == receiverId);
            if (receiver == null)
            {
                return BadRequest();
            }

            // Get messages from chat
            List<string> ids = new List<string>()
            {
                receiver.Id,
                user.Id
            };

            List<Message> messages = _applicationDbContext.Messages
                .FromSql($"select Messages.* from Messages \r\njoin Chats on Messages.ChatId = Chats.Id \r\nwhere Chats.Id in (\r\n\tselect ChatId from (\r\n\t\tselect ChatUsers.ChatId, count(distinct ChatUsers.UserId) as MemberCount \r\n\t\tfrom ChatUsers \r\n\t\twhere ChatUsers.UserId = {receiverId} or ChatUsers.UserId = {user.Id} \r\n\t\tgroup by ChatId\r\n\t) as asdf\r\n\twhere asdf.MemberCount >= {ids.Distinct().ToList().Count()}\r\n)\r\norder by Messages.Id desc")
                .ToList();

            // Convert to response
            List<MessagePresenter> messagePresenters= new List<MessagePresenter>();
            foreach (var message in messages)
            {
                messagePresenters.Add(new MessagePresenter()
                {
                    Id = message.Id,
                    UserId = message.UserId,
                    Content = message.Content,
                });
            }

            return Ok(messagePresenters);
        }
    }
}
